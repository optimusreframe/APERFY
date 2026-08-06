import { describe, expect, it } from 'vitest';
import { buildIncomingOrderMessages, normalizePhone } from './incomingOrder';

describe('incoming order messaging', () => {
  it('normalizes a phone number for WhatsApp links', () => {
    expect(normalizePhone('+1 (407) 555-0199')).toBe('14075550199');
  });

  it('builds a customer confirmation message and a Telegram payload', () => {
    const result = buildIncomingOrderMessages({
      orderCode: 'AP-1042',
      customerName: 'Juan Pérez',
      phone: '+1 (407) 555-0199',
      email: 'juan@example.com',
      items: [{ name: 'Figura APERFY', quantity: 2, total: 18.5 }],
      total: 18.5,
      language: 'es',
      whatsappNumber: '14708469271',
    });

    expect(result.whatsappUrl).toContain('https://wa.me/14708469271?text=');
    expect(result.whatsappMessage).toContain('Hola Juan Pérez');
    expect(result.telegramText).toContain('NUEVO PEDIDO APERFY');
    expect(result.telegramText).toContain('14075550199');
    expect(result.telegramText).toContain('Figura APERFY');
  });
});
