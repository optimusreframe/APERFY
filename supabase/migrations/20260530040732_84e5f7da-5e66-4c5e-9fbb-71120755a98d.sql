
CREATE OR REPLACE FUNCTION public.increment_discount_usage(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.discount_codes SET current_uses = current_uses + 1 WHERE id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage(uuid) TO authenticated;
