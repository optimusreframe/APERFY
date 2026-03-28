
-- Create model_requests table
CREATE TABLE public.model_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  product_name text NOT NULL,
  description text,
  reference_url text,
  images jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  fulfilled_product_id uuid REFERENCES public.products(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form, no auth required)
CREATE POLICY "Anyone can insert model requests"
ON public.model_requests FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all model requests"
ON public.model_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update model requests"
ON public.model_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_model_requests_updated_at
  BEFORE UPDATE ON public.model_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for model request images
INSERT INTO storage.buckets (id, name, public) VALUES ('model-request-images', 'model-request-images', true);

-- Allow anyone to upload to model-request-images
CREATE POLICY "Anyone can upload model request images"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'model-request-images');

-- Allow anyone to view model request images
CREATE POLICY "Anyone can view model request images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'model-request-images');
