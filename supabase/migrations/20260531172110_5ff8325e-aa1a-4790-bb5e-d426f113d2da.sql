
-- Table for system background candidates (AI-generated or manual)
CREATE TABLE public.system_background_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset text NOT NULL,
  image_url text NOT NULL,
  prompt text,
  source text NOT NULL DEFAULT 'ai',
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_background_candidates TO authenticated;
GRANT ALL ON public.system_background_candidates TO service_role;

ALTER TABLE public.system_background_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage system background candidates"
ON public.system_background_candidates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sbc_preset_created ON public.system_background_candidates (preset, created_at DESC);

-- Storage bucket for AI-generated backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-backgrounds', 'system-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read system backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'system-backgrounds');

CREATE POLICY "Admins can upload system backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'system-backgrounds' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update system backgrounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'system-backgrounds' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete system backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'system-backgrounds' AND has_role(auth.uid(), 'admin'::app_role));
