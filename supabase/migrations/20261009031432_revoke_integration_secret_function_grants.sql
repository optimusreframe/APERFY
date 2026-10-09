-- Integration secrets must only be callable by trusted server-side code.
revoke all on function public.get_integration_secret(text) from anon, authenticated, public;
revoke all on function public.list_integration_secret_status() from anon, authenticated, public;
revoke all on function public.upsert_integration_secret(text, text, text) from anon, authenticated, public;

grant execute on function public.get_integration_secret(text) to service_role;
grant execute on function public.list_integration_secret_status() to service_role;
grant execute on function public.upsert_integration_secret(text, text, text) to service_role;
