ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition_status text NOT NULL DEFAULT 'new';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_condition_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_condition_status_check
  CHECK (condition_status IN ('new', 'used'));

-- The source workbook has no Condition column. These are the only imported
-- rows whose own description explicitly identifies a used product.
UPDATE public.products
SET condition_status = 'used'
WHERE inventory_source_key IN (
  'inventory:inventory.xlsx:41:13a904bb-7bdd-49ad-a946-ed34a52706e8.jpg',
  'inventory:inventory.xlsx:50:89a2d63d-5b2b-475f-8f17-ebb1fbdcda4c.jpg',
  'inventory:inventory.xlsx:68:b8d657fc-80ea-4502-92bb-196910500048.jpg',
  'inventory:inventory.xlsx:137:dc59c17b-eb44-42df-b85c-113c06e14aa3.jpg',
  'inventory:inventory.xlsx:148:13bfb6a3-94f3-4f7e-b352-042a99c7acab.jpg'
);
