CREATE TABLE public.background_composition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_image_url text NOT NULL,
  background_image_url text NOT NULL,
  composed_image_url text NOT NULL,
  background_candidate_id uuid,
  method text NOT NULL DEFAULT 'ai',
  preset text,
  product_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.background_composition_results TO authenticated;
GRANT ALL ON public.background_composition_results TO service_role;

ALTER TABLE public.background_composition_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage background composition results"
ON public.background_composition_results
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_bcr_created_at ON public.background_composition_results (created_at DESC);
CREATE INDEX idx_bcr_method ON public.background_composition_results (method);
CREATE INDEX idx_bcr_preset ON public.background_composition_results (preset);