-- Secure integration configuration for APERFY.
-- Secret values live in Supabase Vault and are only readable by service_role
-- through narrowly scoped RPCs. The admin panel never receives existing values.

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
    'FIRECRAWL_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'WHATSAPP_BUSINESS_NUMBER',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_FROM_NAME',
    'RESEND_WEBHOOK_SECRET'
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

CREATE OR REPLACE FUNCTION public.get_integration_secret(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;
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
    'FIRECRAWL_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'WHATSAPP_BUSINESS_NUMBER',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_FROM_NAME',
    'RESEND_WEBHOOK_SECRET'
  )
  ORDER BY s.name;
$$;

REVOKE ALL ON FUNCTION public.upsert_integration_secret(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_integration_secret(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_integration_secret_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_integration_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_integration_secret(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_integration_secret_status() TO service_role;

-- Remove the provisional Lovable defaults from the settings UI. The runtime
-- now uses an OpenAI-compatible provider configured in Admin > Integrations.
UPDATE public.admin_settings
SET setting_value = 'openai'
WHERE setting_key = 'ai_provider'
  AND setting_value = 'lovable-gateway';

UPDATE public.admin_settings
SET setting_value = 'gpt-4o-mini'
WHERE setting_key = 'ai_model'
  AND setting_value = 'google/gemini-3.1-flash-image-preview';
