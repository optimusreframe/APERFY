import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailX, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function EmailUnsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
          headers: { apikey: anonKey },
        });
        const data = await res.json();
        if (res.ok && data.valid) setStatus('valid');
        else if (data.reason === 'already_unsubscribed') setStatus('already');
        else setStatus('invalid');
      } catch { setStatus('error'); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch { setStatus('error'); }
    finally { setSubmitting(false); }
  };

  const content: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: { icon: <Loader2 className="w-12 h-12 text-primary animate-spin" />, title: 'Verifying...', desc: 'Please wait while we verify your unsubscribe request.' },
    valid: { icon: <MailX className="w-12 h-12 text-primary" />, title: 'Unsubscribe', desc: 'Click the button below to unsubscribe from our emails. You will no longer receive app notifications.' },
    already: { icon: <CheckCircle2 className="w-12 h-12 text-green-500" />, title: 'Already Unsubscribed', desc: 'You have already been unsubscribed from our emails.' },
    invalid: { icon: <AlertCircle className="w-12 h-12 text-destructive" />, title: 'Invalid Link', desc: 'This unsubscribe link is invalid or has expired.' },
    success: { icon: <CheckCircle2 className="w-12 h-12 text-green-500" />, title: 'Unsubscribed', desc: 'You have been successfully unsubscribed. You will no longer receive app emails from us.' },
    error: { icon: <AlertCircle className="w-12 h-12 text-destructive" />, title: 'Something Went Wrong', desc: 'We couldn\'t process your request. Please try again later.' },
  };

  const c = content[status];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-24">
        <div className="max-w-md mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center p-10 rounded-2xl bg-card border border-border/50"
          >
            <div className="flex justify-center mb-6">{c.icon}</div>
            <h1 className="font-display font-bold text-2xl mb-3">{c.title}</h1>
            <p className="text-muted-foreground mb-6">{c.desc}</p>
            {status === 'valid' && (
              <Button onClick={handleUnsubscribe} disabled={submitting} variant="destructive" className="w-full">
                {submitting ? 'Processing...' : 'Confirm Unsubscribe'}
              </Button>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
