-- Trigger-only functions must not be callable through the public RPC surface.
-- PostgreSQL triggers execute them as the function owner, so this does not
-- affect verified-review writes while removing an unnecessary attack surface.
REVOKE ALL ON FUNCTION public.mark_verified_review() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_verified_review() TO service_role;
