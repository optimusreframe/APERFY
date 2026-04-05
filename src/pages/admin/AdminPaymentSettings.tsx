import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Save } from 'lucide-react';

const PAYMENT_KEYS = ['payment_zelle', 'payment_binance', 'payment_cashapp'] as const;

interface PaymentConfig {
  active: boolean;
  label: string;
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
    for (const s of settings) {
      try {
        map[s.setting_key] = JSON.parse(s.setting_value || '{}');
      } catch {
        map[s.setting_key] = { active: false, label: '', info: '', instructions: '' };
      }
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
          info: stripHtml(cfg.info).slice(0, 500),
          instructions: stripHtml(cfg.instructions).slice(0, 1000),
        };
        const { error } = await supabase
          .from('admin_settings')
          .update({ setting_value: JSON.stringify(sanitized) })
          .eq('setting_key', key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-settings'] });
      toast({ title: '✓', description: 'Métodos de pago actualizados.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const updateConfig = (key: string, field: keyof PaymentConfig, value: any) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Métodos de Pago
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura los datos de pago que verán los clientes al realizar un pedido.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </Button>
      </div>

      <div className="grid gap-6">
        {PAYMENT_KEYS.map((key) => {
          const cfg = configs[key];
          if (!cfg) return null;
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
