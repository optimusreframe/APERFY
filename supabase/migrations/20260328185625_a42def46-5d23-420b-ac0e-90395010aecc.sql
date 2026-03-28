
-- Fix search_path on validate_review_rating
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix overly permissive storage upload policy
DROP POLICY IF EXISTS "Authenticated users can upload review media" ON storage.objects;
CREATE POLICY "Authenticated users can upload review media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-media' AND (storage.foldername(name))[1] = auth.uid()::text);
