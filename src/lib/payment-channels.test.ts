import { describe, expect, it } from 'vitest';
import { getPaymentChannelDescription, parsePaymentChannelSetting } from './payment-channels';

describe('checkout payment channels', () => {
  it('parses the public channel setting with safe defaults', () => {
    expect(parsePaymentChannelSetting('payment_telegram', JSON.stringify({ active: true }))).toMatchObject({
      active: true,
      label: 'Telegram',
    });
    expect(parsePaymentChannelSetting('payment_whatsapp', null)).toMatchObject({
      active: false,
      label: 'WhatsApp',
    });
  });

  it('returns the localized short customer-facing description', () => {
    const config = parsePaymentChannelSetting('payment_whatsapp', JSON.stringify({
      active: true,
      description_es: 'Completa tu compra rápidamente por WhatsApp.',
      description_en: 'Complete your purchase quickly via WhatsApp.',
    }));
    expect(getPaymentChannelDescription(config, 'es')).toBe('Completa tu compra rápidamente por WhatsApp.');
    expect(getPaymentChannelDescription(config, 'en')).toBe('Complete your purchase quickly via WhatsApp.');
  });
});
