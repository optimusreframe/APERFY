-- Internal queue worker secret and pg_cron schedule.
-- The secret is generated inside Vault and never exposed to the client.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'EMAIL_QUEUE_CRON_SECRET'
  ) THEN
    PERFORM vault.create_secret(
      gen_random_uuid()::text || gen_random_uuid()::text,
      'EMAIL_QUEUE_CRON_SECRET',
      'Internal pg_cron credential for the APERFY email queue worker'
    );
  END IF;
END
$$;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid INTO existing_job_id FROM cron.job WHERE jobname = 'process-email-queue';
  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END
$$;

SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xftxyvgplghnelawkhvl.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'EMAIL_QUEUE_CRON_SECRET'),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
