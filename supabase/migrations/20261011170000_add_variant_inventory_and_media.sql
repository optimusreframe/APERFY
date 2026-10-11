-- Variant inventory is opt-in per option. When a product has active variants,
-- the application disables the parent product inventory and uses these rows
-- as the authoritative stock buckets instead.
alter table public.product_variations
  add column if not exists inventory_enabled boolean not null default false,
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 3,
  add column if not exists description_en text not null default '',
  add column if not exists description_es text not null default '',
  add column if not exists images jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_variations_stock_quantity_nonnegative'
      and conrelid = 'public.product_variations'::regclass
  ) then
    alter table public.product_variations
      add constraint product_variations_stock_quantity_nonnegative check (stock_quantity >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_variations_low_stock_threshold_nonnegative'
      and conrelid = 'public.product_variations'::regclass
  ) then
    alter table public.product_variations
      add constraint product_variations_low_stock_threshold_nonnegative check (low_stock_threshold >= 0);
  end if;
end $$;

comment on column public.product_variations.inventory_enabled is 'When true, this variant controls availability for the selected option.';
comment on column public.product_variations.stock_quantity is 'Current sellable quantity for this variant.';
comment on column public.product_variations.low_stock_threshold is 'Displayed as low stock when this variant stock is at or below this value.';
comment on column public.product_variations.description_en is 'Optional variant-specific English description shown when this option is selected.';
comment on column public.product_variations.description_es is 'Optional variant-specific Spanish description shown when this option is selected.';
comment on column public.product_variations.images is 'Additional variant media URLs. image_url remains as the legacy primary-image field.';

alter table public.products
  add column if not exists allows_special_notes boolean not null default false;

comment on column public.products.allows_special_notes is 'When true, customers may add a custom request or personalization note at checkout.';

alter table public.inventory_movements
  add column if not exists variation_id uuid references public.product_variations(id) on delete set null;

create index if not exists inventory_movements_variation_created_idx
  on public.inventory_movements (variation_id, created_at desc);
