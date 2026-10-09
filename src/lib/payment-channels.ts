export type CheckoutPaymentChannel = 'whatsapp' | 'telegram';

export interface PaymentChannelConfig {
  active: boolean;
  label: string;
  description_en: string;
  description_es: string;
  info: string;
  instructions: string;
}

const DEFAULTS: Record<CheckoutPaymentChannel, PaymentChannelConfig> = {
  whatsapp: {
    active: false,
    label: 'WhatsApp',
    description_en: 'Complete your purchase quickly via WhatsApp.',
    description_es: 'Completa tu compra rápidamente por WhatsApp.',
    info: '',
    instructions: '',
  },
  telegram: {
    active: false,
    label: 'Telegram',
    description_en: 'Complete your purchase via Telegram.',
    description_es: 'Completa tu compra por Telegram.',
    info: '',
    instructions: '',
  },
};

export const CHECKOUT_PAYMENT_KEYS = ['payment_whatsapp', 'payment_telegram'] as const;

export function paymentChannelFromKey(key: string): CheckoutPaymentChannel | null {
  if (key === 'payment_whatsapp') return 'whatsapp';
  if (key === 'payment_telegram') return 'telegram';
  return null;
}

export function parsePaymentChannelSetting(key: string, raw: string | null | undefined): PaymentChannelConfig {
  const channel = paymentChannelFromKey(key);
  const fallback = channel ? DEFAULTS[channel] : DEFAULTS.whatsapp;
  try {
    const value = JSON.parse(raw || '{}') as Partial<PaymentChannelConfig>;
    return {
      ...fallback,
      ...value,
      active: value.active === true,
      label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : fallback.label,
      description_en: typeof value.description_en === 'string' && value.description_en.trim() ? value.description_en.trim() : fallback.description_en,
      description_es: typeof value.description_es === 'string' && value.description_es.trim() ? value.description_es.trim() : fallback.description_es,
      info: typeof value.info === 'string' ? value.info : fallback.info,
      instructions: typeof value.instructions === 'string' ? value.instructions : fallback.instructions,
    };
  } catch {
    return fallback;
  }
}

export function getPaymentChannelDescription(config: Partial<PaymentChannelConfig>, language: 'es' | 'en'): string {
  const fallback = DEFAULTS.whatsapp;
  return language === 'es'
    ? config.description_es || fallback.description_es
    : config.description_en || fallback.description_en;
}

export function getDefaultPaymentChannel(channel: CheckoutPaymentChannel): PaymentChannelConfig {
  return { ...DEFAULTS[channel] };
}
