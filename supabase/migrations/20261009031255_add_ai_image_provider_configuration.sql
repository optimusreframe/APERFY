-- Keep image/vision credentials separate from the text provider.
-- Values remain in Supabase Vault and are only read by service-role Edge Functions.

CREATE OR REPLACE FUNCTION public.upsert_integration_secret(
  p_name TEXT,
  p_secret TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_id UUID;
BEGIN
  IF p_name NOT IN (
    'AI_PROVIDER_API_KEY',
    'AI_PROVIDER_BASE_URL',
    'AI_IMAGE_PROVIDER_API_KEY',
    'AI_IMAGE_PROVIDER_BASE_URL',
    'FIRECRAWL_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'WHATSAPP_BUSINESS_NUMBER',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_FROM_NAME',
    'RESEND_WEBHOOK_SECRET',
    'EMAIL_QUEUE_CRON_SECRET'
  ) THEN
    RAISE EXCEPTION 'Unsupported integration secret';
  END IF;

  IF p_secret IS NULL OR length(trim(p_secret)) = 0 THEN
    RAISE EXCEPTION 'Secret value cannot be empty';
  END IF;

  SELECT id INTO secret_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF secret_id IS NULL THEN
    SELECT vault.create_secret(p_secret, p_name, p_description) INTO secret_id;
  ELSE
    PERFORM vault.update_secret(secret_id, p_secret, p_name, p_description);
  END IF;

  RETURN secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_integration_secret_status()
RETURNS TABLE(name TEXT, configured BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT s.name, TRUE, s.updated_at
  FROM vault.secrets AS s
  WHERE s.name IN (
    'AI_PROVIDER_API_KEY',
    'AI_PROVIDER_BASE_URL',
    'AI_IMAGE_PROVIDER_API_KEY',
    'AI_IMAGE_PROVIDER_BASE_URL',
    'FIRECRAWL_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'WHATSAPP_BUSINESS_NUMBER',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_FROM_NAME',
    'RESEND_WEBHOOK_SECRET',
    'EMAIL_QUEUE_CRON_SECRET'
  )
  ORDER BY s.name;
$$;

REVOKE ALL ON FUNCTION public.upsert_integration_secret(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_integration_secret_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_integration_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_integration_secret_status() TO service_role;
