import { supabase } from '@/integrations/supabase/client';

interface SendEmailParams {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, any>;
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: params,
    });
  } catch (err) {
    console.error('Failed to send transactional email:', err);
  }
}
