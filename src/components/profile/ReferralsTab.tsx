import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Gift, Copy, Share2, Check, Users, ShoppingBag, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function generateCode(userId: string) {
  // Stable, short code derived from user id.
  const hex = userId.replace(/-/g, '').toUpperCase();
  return `APF${hex.slice(0, 6)}`;
}

export default function ReferralsTab() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: codeRow, isLoading } = useQuery({
    queryKey: ['referral-code', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('referral_codes')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Auto-create if missing.
  useEffect(() => {
    if (!user || codeRow || isLoading) return;
    (async () => {
      const code = generateCode(user.id);
      await (supabase as any).from('referral_codes').insert({ user_id: user.id, code });
      qc.invalidateQueries({ queryKey: ['referral-code', user.id] });
    })();
  }, [user, codeRow, isLoading, qc]);

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const code = codeRow?.code || (user ? generateCode(user.id) : '');
  const link = typeof window !== 'undefined' ? `${window.location.origin}/auth?ref=${code}` : '';

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: language === 'es' ? '¡Link copiado!' : 'Link copied!' });
    setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'APERFY',
          text:
            language === 'es'
              ? 'Mira estos hallazgos seleccionados en APERFY. Usa mi código para descubrir la tienda.'
              : 'Explore these curated finds on APERFY. Use my code to discover the store.',
          url: link,
        });
      } catch {}
    } else {
      copy();
    }
  };

  const stats = [
    {
      label: language === 'es' ? 'Referidos' : 'Referrals',
      value: codeRow?.total_signups ?? referrals.length,
      icon: Users,
      gradient: 'from-blue-500/20 to-cyan-500/10',
    },
    {
      label: language === 'es' ? 'Compras' : 'Orders',
      value: codeRow?.total_orders ?? referrals.filter((r: any) => r.first_order_id).length,
      icon: ShoppingBag,
      gradient: 'from-purple-500/20 to-pink-500/10',
    },
    {
      label: language === 'es' ? 'Recompensas' : 'Rewards',
      value: `$${Number(codeRow?.total_rewards || 0).toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-amber-500/20 to-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <Card className="bg-gradient-to-br from-card to-secondary/50 border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-2">
            <Gift className="w-3.5 h-3.5" />
            {language === 'es' ? 'Programa de referidos' : 'Referral program'}
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground">
            {language === 'es' ? 'Comparte y gana' : 'Share & earn'}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {language === 'es'
              ? 'Por cada amigo que compre con tu código, ambos ganan $5 de descuento.'
              : 'For every friend who buys with your code, you both earn $5 off.'}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 rounded-xl border border-primary/20 bg-background/60 px-4 py-3 font-mono text-lg tracking-[0.2em] tabular-nums text-primary">
              {code || '...'}
            </div>
            <Button onClick={copy} className="gap-2 bg-gradient-gold text-primary-foreground font-bold rounded-xl h-12 px-5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? (language === 'es' ? 'Copiado' : 'Copied') : language === 'es' ? 'Copiar link' : 'Copy link'}
            </Button>
            <Button onClick={share} variant="outline" className="gap-2 rounded-xl h-12 px-5 border-white/10">
              <Share2 className="w-4 h-4" />
              {language === 'es' ? 'Compartir' : 'Share'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={`bg-gradient-to-br ${s.gradient} border-border/50`}>
              <CardContent className="p-5">
                <s.icon className="w-5 h-5 text-muted-foreground mb-3" />
                <div className="font-display font-black text-3xl text-foreground tabular-nums">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* List */}
      {referrals.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              {language === 'es' ? 'Actividad' : 'Activity'}
            </div>
            <ul className="space-y-2">
              {referrals.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between text-sm border-b border-white/[0.04] pb-2 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-primary">{r.status}</span>
                  <span className="font-mono tabular-nums text-foreground">${Number(r.reward_amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
