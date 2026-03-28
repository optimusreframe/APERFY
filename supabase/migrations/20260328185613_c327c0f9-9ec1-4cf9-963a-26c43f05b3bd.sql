
-- Product Likes table
CREATE TABLE public.product_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.product_likes FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert own likes" ON public.product_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own likes" ON public.product_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Product Reviews table
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  media jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Validation trigger for rating (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER check_review_rating
  BEFORE INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- Function to check if user purchased a product
CREATE OR REPLACE FUNCTION public.has_purchased_product(_user_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = _user_id
      AND oi.product_id = _product_id
      AND o.status IN ('confirmed', 'printing', 'shipped', 'delivered')
  )
$function$;

-- RLS for reviews
CREATE POLICY "Anyone can view reviews" ON public.product_reviews FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert own reviews if purchased" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND has_purchased_product(auth.uid(), product_id));
CREATE POLICY "Users can update own reviews" ON public.product_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own reviews" ON public.product_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Updated_at trigger for reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Review media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('review-media', 'review-media', true);

-- Storage RLS for review-media
CREATE POLICY "Anyone can view review media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'review-media');
CREATE POLICY "Authenticated users can upload review media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-media');
CREATE POLICY "Users can delete own review media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'review-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for likes (for live counts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_likes;
