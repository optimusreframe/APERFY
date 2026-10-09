-- Product-level inventory is opt-in so legacy catalog rows keep their current
-- availability until an administrator enters real stock counts.
alter table public.products
  add column if not exists inventory_enabled boolean not null default false,
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_stock_quantity_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_stock_quantity_nonnegative check (stock_quantity >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_low_stock_threshold_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_low_stock_threshold_nonnegative check (low_stock_threshold >= 0);
  end if;
end $$;

comment on column public.products.inventory_enabled is 'When true, checkout and storefront availability use stock_quantity.';
comment on column public.products.stock_quantity is 'Current sellable quantity for this product.';
comment on column public.products.low_stock_threshold is 'Displayed as low stock when stock_quantity is at or below this value.';

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  quantity_delta integer not null check (quantity_delta <> 0),
  stock_after integer not null check (stock_after >= 0),
  reason text not null check (reason in ('order_reserved', 'order_cancelled', 'manual_adjustment', 'import')),
  notes text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements (product_id, created_at desc);
create index if not exists inventory_movements_order_idx
  on public.inventory_movements (order_id);

alter table public.inventory_movements enable row level security;
revoke all on table public.inventory_movements from anon;
grant select on table public.inventory_movements to authenticated;
drop policy if exists "Admins can view inventory movements" on public.inventory_movements;
create policy "Admins can view inventory movements"
  on public.inventory_movements for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

-- Internal helpers are called by the authenticated wrapper and the order-status
-- trigger. They lock products in deterministic order and preflight every line
-- before mutating any stock, preventing partial reservations and overselling.
create or replace function public.reserve_stock_for_order_internal(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  product_row record;
  reserved_qty integer;
  released_qty integer;
begin
  for item in
    select oi.product_id, sum(oi.quantity)::integer as requested_qty
    from public.order_items oi
    where oi.order_id = p_order_id
    group by oi.product_id
    order by oi.product_id
  loop
    select p.inventory_enabled, p.stock_quantity
      into product_row
      from public.products p
      where p.id = item.product_id
      for update;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'PRODUCT_NOT_FOUND', 'product_id', item.product_id);
    end if;

    select
      coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
      coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
      into reserved_qty, released_qty
      from public.inventory_movements im
      where im.order_id = p_order_id and im.product_id = item.product_id;

    if product_row.inventory_enabled and reserved_qty <= released_qty
       and product_row.stock_quantity < item.requested_qty then
      return jsonb_build_object(
        'ok', false,
        'code', 'INSUFFICIENT_STOCK',
        'product_id', item.product_id,
        'available', product_row.stock_quantity,
        'requested', item.requested_qty
      );
    end if;
  end loop;

  for item in
    select oi.product_id, sum(oi.quantity)::integer as requested_qty
    from public.order_items oi
    where oi.order_id = p_order_id
    group by oi.product_id
    order by oi.product_id
  loop
    select p.inventory_enabled, p.stock_quantity
      into product_row
      from public.products p
      where p.id = item.product_id
      for update;

    select
      coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
      coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
      into reserved_qty, released_qty
      from public.inventory_movements im
      where im.order_id = p_order_id and im.product_id = item.product_id;

    if product_row.inventory_enabled and reserved_qty <= released_qty then
      update public.products
        set stock_quantity = product_row.stock_quantity - item.requested_qty,
            updated_at = now()
        where id = item.product_id;

      insert into public.inventory_movements (
        product_id, order_id, quantity_delta, stock_after, reason, actor_id
      ) values (
        item.product_id, p_order_id, -item.requested_qty,
        product_row.stock_quantity - item.requested_qty,
        'order_reserved', auth.uid()
      );
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end;
$$;

create or replace function public.release_stock_for_order_internal(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  product_row record;
  reserved_qty integer;
  released_qty integer;
  restore_qty integer;
begin
  for item in
    select im.product_id
    from public.inventory_movements im
    where im.order_id = p_order_id and im.reason = 'order_reserved'
    group by im.product_id
    order by im.product_id
  loop
    select
      coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
      coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
      into reserved_qty, released_qty
      from public.inventory_movements im
      where im.order_id = p_order_id and im.product_id = item.product_id;

    restore_qty := reserved_qty - released_qty;
    if restore_qty <= 0 then continue; end if;

    select p.stock_quantity into product_row
      from public.products p
      where p.id = item.product_id
      for update;
    if not found then continue; end if;

    update public.products
      set stock_quantity = product_row.stock_quantity + restore_qty,
          updated_at = now()
      where id = item.product_id;

    insert into public.inventory_movements (
      product_id, order_id, quantity_delta, stock_after, reason, actor_id
    ) values (
      item.product_id, p_order_id, restore_qty,
      product_row.stock_quantity + restore_qty,
      'order_cancelled', auth.uid()
    );
  end loop;

  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end;
$$;

create or replace function public.sync_order_inventory_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    perform public.release_stock_for_order_internal(new.id);
  elsif old.status is distinct from new.status and new.status <> 'pending' then
    result := public.reserve_stock_for_order_internal(new.id);
    if coalesce((result->>'ok')::boolean, false) = false then
      raise exception '%', coalesce(result->>'code', 'INSUFFICIENT_STOCK') using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_inventory_status_trigger on public.orders;
create trigger orders_inventory_status_trigger
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_order_inventory_status();

create or replace function public.reserve_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_owner uuid;
  result jsonb;
begin
  select o.user_id into order_owner from public.orders o where o.id = p_order_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_FOUND');
  end if;
  if (select auth.uid()) is null
     or (select auth.uid()) <> order_owner
        and not public.has_role((select auth.uid()), 'admin') then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  result := public.reserve_stock_for_order_internal(p_order_id);
  if coalesce((result->>'ok')::boolean, false) = false then
    update public.orders set status = 'cancelled' where id = p_order_id and status = 'pending';
  end if;
  return result;
end;
$$;

revoke all on function public.reserve_stock_for_order_internal(uuid) from public, anon, authenticated;
revoke all on function public.release_stock_for_order_internal(uuid) from public, anon, authenticated;
revoke all on function public.sync_order_inventory_status() from public, anon, authenticated;
revoke all on function public.reserve_order_stock(uuid) from public, anon;
grant execute on function public.reserve_order_stock(uuid) to authenticated, service_role;
