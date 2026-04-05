
CREATE TABLE public.shipping_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description_en TEXT DEFAULT '',
  description_es TEXT DEFAULT '',
  base_rate NUMERIC NOT NULL DEFAULT 0,
  per_kg_rate NUMERIC NOT NULL DEFAULT 0,
  estimated_days_min INTEGER DEFAULT 1,
  estimated_days_max INTEGER DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shipping providers"
  ON public.shipping_providers FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage shipping providers"
  ON public.shipping_providers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_provider_id UUID DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
