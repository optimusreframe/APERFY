import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ExternalLink, MessageCircle, Save, Send } from 'lucide-react';
import { AdminPageHeader } from './_shared';
import { CHECKOUT_PAYMENT_KEYS, getDefaultPaymentChannel, parsePaymentChannelSetting, paymentChannelFromKey } from '@/lib/payment-channels';

const PAYMENT_KEYS = [...CHECKOUT_PAYMENT_KEYS, 'payment_zelle', 'payment_binance', 'payment_cashapp'] as const;

interface PaymentConfig {
  active: boolean;
  label: string;
  description_en?: string;
  description_es?: string;
  info: string;
  instructions: string;
}

const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '').trim();

export default function AdminPaymentSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [configs, setConfigs] = useState<Record<string, PaymentConfig>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('setting_key', [...PAYMENT_KEYS]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings) return;
    const map: Record<string, PaymentConfig> = {};
    for (const key of CHECKOUT_PAYMENT_KEYS) {
      const channel = paymentChannelFromKey(key);
      if (channel) map[key] = getDefaultPaymentChannel(channel);
    }
    for (const s of settings) {
      map[s.setting_key] = paymentChannelFromKey(s.setting_key)
        ? parsePaymentChannelSetting(s.setting_key, s.setting_value)
        : (() => {
          try { return { active: false, label: '', info: '', instructions: '', ...JSON.parse(s.setting_value || '{}') }; }
          catch { return { active: false, label: '', info: '', instructions: '' }; }
        })();
    }
    setConfigs(map);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const key of PAYMENT_KEYS) {
        const cfg = configs[key];
        if (!cfg) continue;
        // Sanitize
        const sanitized: PaymentConfig = {
          active: cfg.active,
          label: stripHtml(cfg.label).slice(0, 100),
          description_en: stripHtml(cfg.description_en || '').slice(0, 180),
          description_es: stripHtml(cfg.description_es || '').slice(0, 180),
          info: stripHtml(cfg.info).slice(0, 500),
          instructions: stripHtml(cfg.instructions).slice(0, 1000),
        };
        const { error } = await supabase
          .from('admin_settings')
          .upsert({ setting_key: key, setting_value: JSON.stringify(sanitized) }, { onConflict: 'setting_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-settings'] });
      toast({ title: '✓', description: 'Métodos de pago actualizados.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save payment settings', variant: 'destructive' });
    },
  });

  const updateConfig = (key: string, field: keyof PaymentConfig, value: PaymentConfig[keyof PaymentConfig]) => {
    setConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const labels: Record<string, { icon: string; title: string }> = {
    payment_zelle: { icon: '💵', title: 'Zelle' },
    payment_binance: { icon: '🪙', title: 'Binance Pay (USDT)' },
    payment_cashapp: { icon: '💰', title: 'CashApp' },
  };

  const channelMeta: Record<string, { title: string; description: string; icon: typeof MessageCircle }> = {
    payment_whatsapp: { title: 'WhatsApp', description: 'El cliente recibirá un enlace con la comanda completa para enviarla por WhatsApp.', icon: MessageCircle },
    payment_telegram: { title: 'Telegram', description: 'El cliente recibirá un enlace para enviar la misma comanda por Telegram.', icon: Send },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="operations · payments"
        title="Métodos de Pago"
        meta="Configura los datos de pago que verán los clientes al realizar un pedido."
        actions={
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </Button>
        }
      />

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Destinos de mensajería</p>
            <p className="mt-1">El número de WhatsApp y el destino de Telegram se configuran de forma segura en Integraciones.</p>
            <a href="/admin/integrations" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-primary hover:text-primary/80">
              Configurar WhatsApp y Telegram <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {PAYMENT_KEYS.map((key) => {
          const cfg = configs[key];
          if (!cfg) return null;
          const channel = paymentChannelFromKey(key);
          if (channel) {
            const meta = channelMeta[key];
            const Icon = meta.icon;
            return (
              <div key={key} className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                    <div><h2 className="font-display text-lg font-bold">{meta.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2"><Label className="text-xs text-muted-foreground">Activo</Label><Switch checked={cfg.active} onCheckedChange={(active) => updateConfig(key, 'active', active)} /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label className="text-xs">Descripción en español</Label><Input value={cfg.description_es || ''} onChange={(event) => updateConfig(key, 'description_es', event.target.value)} className="mt-1 bg-background" maxLength={180} /></div>
                  <div><Label className="text-xs">Description in English</Label><Input value={cfg.description_en || ''} onChange={(event) => updateConfig(key, 'description_en', event.target.value)} className="mt-1 bg-background" maxLength={180} /></div>
                </div>
              </div>
            );
          }
          const meta = labels[key];
          return (
            <div key={key} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <span className="text-xl">{meta.icon}</span>
                  {meta.title}
                </h2>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Activo</Label>
                  <Switch
                    checked={cfg.active}
                    onCheckedChange={(c) => updateConfig(key, 'active', c)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Datos de pago (email, wallet, $tag, etc.)</Label>
                  <Input
                    value={cfg.info}
                    onChange={(e) => updateConfig(key, 'info', e.target.value)}
                    className="mt-1 bg-background"
                    placeholder="ej. email@zelle.com o $cashtag"
                    maxLength={500}
                  />
                </div>
                <div>
                  <Label className="text-xs">Instrucciones para el cliente</Label>
                  <Textarea
                    value={cfg.instructions}
                    onChange={(e) => updateConfig(key, 'instructions', e.target.value)}
                    className="mt-1 bg-background"
                    placeholder="Instrucciones paso a paso para que el cliente realice el pago..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
