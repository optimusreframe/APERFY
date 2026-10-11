-- Replace product-only reservation with a bucket-aware implementation. Product
-- lines continue to work for legacy products without active variants, while
-- selected variant lines reserve against product_variations.stock_quantity.
create or replace function public.reserve_stock_for_order_internal(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  product_row record;
  variation_row record;
  reserved_qty integer;
  released_qty integer;
begin
  if exists (
    select 1
      from public.order_items oi
     where oi.order_id = p_order_id
       and jsonb_typeof(coalesce(oi.selected_variations, '[]'::jsonb)) <> 'array'
  ) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VARIATIONS');
  end if;

  if exists (
    select 1
      from public.order_items oi
      cross join lateral jsonb_array_elements(coalesce(oi.selected_variations, '[]'::jsonb)) selected
     where oi.order_id = p_order_id
       and not (coalesce(selected.value->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VARIATION');
  end if;

  -- Preflight every stock bucket before mutating any row, so a mixed order
  -- cannot reserve only some products or variants.
  for item in
    select bucket.product_id, bucket.variation_id, sum(bucket.requested_qty)::integer as requested_qty
      from (
        select oi.product_id, null::uuid as variation_id, sum(oi.quantity)::integer as requested_qty
          from public.order_items oi
         where oi.order_id = p_order_id
           and jsonb_array_length(coalesce(oi.selected_variations, '[]'::jsonb)) = 0
         group by oi.product_id
        union all
        select oi.product_id,
               (selected.value->>'id')::uuid as variation_id,
               sum(oi.quantity)::integer as requested_qty
          from public.order_items oi
          cross join lateral jsonb_array_elements(coalesce(oi.selected_variations, '[]'::jsonb)) selected
         where oi.order_id = p_order_id
         group by oi.product_id, (selected.value->>'id')::uuid
      ) bucket
     group by bucket.product_id, bucket.variation_id
     order by bucket.product_id, bucket.variation_id nulls first
  loop
    if item.variation_id is null then
      select p.inventory_enabled, p.stock_quantity
        into product_row
        from public.products p
       where p.id = item.product_id
       for update;

      if not found then
        return jsonb_build_object('ok', false, 'code', 'PRODUCT_NOT_FOUND', 'product_id', item.product_id);
      end if;

      if exists (
        select 1 from public.product_variations v
         where v.product_id = item.product_id and v.is_active
      ) then
        return jsonb_build_object('ok', false, 'code', 'MISSING_VARIATION', 'product_id', item.product_id);
      end if;

      select
        coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
        coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
        into reserved_qty, released_qty
        from public.inventory_movements im
       where im.order_id = p_order_id
         and im.product_id = item.product_id
         and im.variation_id is null;

      if product_row.inventory_enabled
         and reserved_qty <= released_qty
         and product_row.stock_quantity < item.requested_qty then
        return jsonb_build_object(
          'ok', false,
          'code', 'INSUFFICIENT_STOCK',
          'product_id', item.product_id,
          'available', product_row.stock_quantity,
          'requested', item.requested_qty
        );
      end if;
    else
      perform 1
        from public.products p
       where p.id = item.product_id
       for update;
      if not found then
        return jsonb_build_object('ok', false, 'code', 'PRODUCT_NOT_FOUND', 'product_id', item.product_id);
      end if;

      select v.inventory_enabled, v.stock_quantity, v.product_id, v.is_active
        into variation_row
        from public.product_variations v
       where v.id = item.variation_id
         and v.product_id = item.product_id
       for update;

      if not found or not variation_row.is_active then
        return jsonb_build_object(
          'ok', false,
          'code', 'VARIATION_NOT_FOUND',
          'product_id', item.product_id,
          'variation_id', item.variation_id
        );
      end if;

      select
        coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
        coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
        into reserved_qty, released_qty
        from public.inventory_movements im
       where im.order_id = p_order_id
         and im.product_id = item.product_id
         and im.variation_id = item.variation_id;

      if variation_row.inventory_enabled
         and reserved_qty <= released_qty
         and variation_row.stock_quantity < item.requested_qty then
        return jsonb_build_object(
          'ok', false,
          'code', 'INSUFFICIENT_VARIATION_STOCK',
          'product_id', item.product_id,
          'variation_id', item.variation_id,
          'available', variation_row.stock_quantity,
          'requested', item.requested_qty
        );
      end if;
    end if;
  end loop;

  -- All buckets passed validation; apply reservation movements atomically.
  for item in
    select bucket.product_id, bucket.variation_id, sum(bucket.requested_qty)::integer as requested_qty
      from (
        select oi.product_id, null::uuid as variation_id, sum(oi.quantity)::integer as requested_qty
          from public.order_items oi
         where oi.order_id = p_order_id
           and jsonb_array_length(coalesce(oi.selected_variations, '[]'::jsonb)) = 0
         group by oi.product_id
        union all
        select oi.product_id,
               (selected.value->>'id')::uuid as variation_id,
               sum(oi.quantity)::integer as requested_qty
          from public.order_items oi
          cross join lateral jsonb_array_elements(coalesce(oi.selected_variations, '[]'::jsonb)) selected
         where oi.order_id = p_order_id
         group by oi.product_id, (selected.value->>'id')::uuid
      ) bucket
     group by bucket.product_id, bucket.variation_id
     order by bucket.product_id, bucket.variation_id nulls first
  loop
    if item.variation_id is null then
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
       where im.order_id = p_order_id
         and im.product_id = item.product_id
         and im.variation_id is null;

      if product_row.inventory_enabled and reserved_qty <= released_qty then
        update public.products
           set stock_quantity = product_row.stock_quantity - item.requested_qty,
               updated_at = now()
         where id = item.product_id;

        insert into public.inventory_movements (
          product_id, variation_id, order_id, quantity_delta, stock_after, reason, actor_id
        ) values (
          item.product_id, null, p_order_id, -item.requested_qty,
          product_row.stock_quantity - item.requested_qty,
          'order_reserved', auth.uid()
        );
      end if;
    else
      select v.inventory_enabled, v.stock_quantity
        into variation_row
        from public.product_variations v
       where v.id = item.variation_id
         and v.product_id = item.product_id
       for update;

      select
        coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
        coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
        into reserved_qty, released_qty
        from public.inventory_movements im
       where im.order_id = p_order_id
         and im.product_id = item.product_id
         and im.variation_id = item.variation_id;

      if variation_row.inventory_enabled and reserved_qty <= released_qty then
        update public.product_variations
           set stock_quantity = variation_row.stock_quantity - item.requested_qty
         where id = item.variation_id;

        insert into public.inventory_movements (
          product_id, variation_id, order_id, quantity_delta, stock_after, reason, actor_id
        ) values (
          item.product_id, item.variation_id, p_order_id, -item.requested_qty,
          variation_row.stock_quantity - item.requested_qty,
          'order_reserved', auth.uid()
        );
      end if;
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
  variation_row record;
  reserved_qty integer;
  released_qty integer;
  restore_qty integer;
begin
  for item in
    select im.product_id, im.variation_id
      from public.inventory_movements im
     where im.order_id = p_order_id
       and im.reason = 'order_reserved'
     group by im.product_id, im.variation_id
     order by im.product_id, im.variation_id nulls first
  loop
    select
      coalesce(sum(case when im.reason = 'order_reserved' then -im.quantity_delta else 0 end), 0)::integer,
      coalesce(sum(case when im.reason = 'order_cancelled' then im.quantity_delta else 0 end), 0)::integer
      into reserved_qty, released_qty
      from public.inventory_movements im
     where im.order_id = p_order_id
       and im.product_id = item.product_id
       and im.variation_id is not distinct from item.variation_id;

    restore_qty := reserved_qty - released_qty;
    if restore_qty <= 0 then continue; end if;

    if item.variation_id is null then
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
        product_id, variation_id, order_id, quantity_delta, stock_after, reason, actor_id
      ) values (
        item.product_id, null, p_order_id, restore_qty,
        product_row.stock_quantity + restore_qty,
        'order_cancelled', auth.uid()
      );
    else
      select v.stock_quantity into variation_row
        from public.product_variations v
       where v.id = item.variation_id
         and v.product_id = item.product_id
       for update;
      if not found then continue; end if;

      update public.product_variations
         set stock_quantity = variation_row.stock_quantity + restore_qty
       where id = item.variation_id;

      insert into public.inventory_movements (
        product_id, variation_id, order_id, quantity_delta, stock_after, reason, actor_id
      ) values (
        item.product_id, item.variation_id, p_order_id, restore_qty,
        variation_row.stock_quantity + restore_qty,
        'order_cancelled', auth.uid()
      );
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end;
$$;

grant execute on function public.reserve_stock_for_order_internal(uuid) to service_role;
grant execute on function public.release_stock_for_order_internal(uuid) to service_role;
