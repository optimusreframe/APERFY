CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'info',
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  details text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage logs" ON public.activity_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_activity_logs_category ON public.activity_logs(category);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);