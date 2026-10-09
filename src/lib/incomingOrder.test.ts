import { describe, expect, it } from 'vitest';
import { buildIncomingOrderMessages, normalizePhone } from './incomingOrder';

describe('incoming order messaging', () => {
  it('normalizes a phone number for WhatsApp links', () => {
    expect(normalizePhone('+1 (407) 555-0199')).toBe('14075550199');
  });

  it('normalizes international access-prefix numbers for wa.me links', () => {
    expect(normalizePhone('0044 7700 900123')).toBe('447700900123');
    expect(normalizePhone('011 44 7700 900123')).toBe('447700900123');
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
      shipping: '123 Main St, Miami, FL 33101, United States',
    });

    expect(result.whatsappUrl).toContain('https://wa.me/14708469271?text=');
    expect(result.whatsappMessage).toContain('Hola APERFY, soy Juan Pérez');
    expect(result.whatsappMessage).toContain('Teléfono: +1 (407) 555-0199');
    expect(result.whatsappMessage).toContain('Email: juan@example.com');
    expect(result.whatsappMessage).toContain('Dirección: 123 Main St, Miami, FL 33101, United States');
    expect(result.customerWhatsAppMessage).toContain('Hola Juan Pérez, hemos recibido tu nuevo pedido.');
    expect(result.customerWhatsAppUrl).toContain('https://wa.me/14075550199?text=');
    expect(result.telegramText).toContain('NUEVO PEDIDO APERFY');
    expect(result.telegramText).toContain('14075550199');
    expect(result.telegramText).toContain('Figura APERFY');
  });

  it('formats a Spanish receipt with item subtotal, shipping, payment, and the confirmation step', () => {
    const result = buildIncomingOrderMessages({
      orderCode: 'AP-2048',
      customerName: 'María López',
      phone: '+44 7700 900123',
      email: 'maria@example.com',
      items: [
        { name: 'Vela artesanal', quantity: 2, total: 24.5, variation: 'Lavanda' },
        { name: 'Tarjeta', quantity: 1, total: 4.25 },
      ],
      total: 35.75,
      language: 'es',
      whatsappNumber: '+1 (470) 846-9271',
      shipping: 'Calle 10, Madrid, España',
      notes: 'Entregar después de las 5',
      paymentMethod: 'Zelle',
      paymentState: 'pending',
    });

    expect(result.whatsappMessage).toContain('APERFY');
    expect(result.whatsappMessage).toContain('Orden: #AP-2048');
    expect(result.whatsappMessage).toContain('Cliente: María López');
    expect(result.whatsappMessage).toContain('Teléfono: +44 7700 900123');
    expect(result.whatsappMessage).toContain('Email: maria@example.com');
    expect(result.whatsappMessage).toContain('Dirección: Calle 10, Madrid, España');
    expect(result.whatsappMessage).toContain('2 × Vela artesanal (Lavanda) — $24.50');
    expect(result.whatsappMessage).toContain('1 × Tarjeta — $4.25');
    expect(result.whatsappMessage).toContain('Subtotal de productos: $28.75');
    expect(result.whatsappMessage).toContain('Total del pedido: $35.75');
    expect(result.whatsappMessage).toContain('Método de pago: Zelle');
    expect(result.whatsappMessage).toContain('Estado del pago: Pendiente');
    expect(result.whatsappMessage).toContain('Notas: Entregar después de las 5');
    expect(result.customerWhatsAppMessage).toContain('¿Nos confirmas que podemos continuar con tu pedido?');
    expect(result.whatsappUrl).toBe(`https://wa.me/14708469271?text=${encodeURIComponent(result.whatsappMessage)}`);
    expect(result.customerWhatsAppUrl).toBe(`https://wa.me/447700900123?text=${encodeURIComponent(result.customerWhatsAppMessage)}`);
  });

  it('uses English receipt labels and payment-state wording for English orders', () => {
    const result = buildIncomingOrderMessages({
      orderCode: 'AP-9',
      customerName: 'Jamie Doe',
      phone: '+1 212 555 0199',
      email: 'jamie@example.com',
      items: [{ name: 'Desk lamp', quantity: 1, total: 18 }],
      total: 22,
      language: 'en',
      whatsappNumber: '14708469271',
      shipping: 'New York, NY',
      paymentMethod: 'Cash on delivery',
      paymentState: 'paid',
    });

    expect(result.whatsappMessage).toContain('Order: #AP-9');
    expect(result.whatsappMessage).toContain('Customer: Jamie Doe');
    expect(result.whatsappMessage).toContain('Address: New York, NY');
    expect(result.whatsappMessage).toContain('1 × Desk lamp — $18.00');
    expect(result.whatsappMessage).toContain('Items subtotal: $18.00');
    expect(result.whatsappMessage).toContain('Order total: $22.00');
    expect(result.whatsappMessage).toContain('Payment method: Cash on delivery');
    expect(result.whatsappMessage).toContain('Payment status: Paid');
    expect(result.customerWhatsAppMessage).toContain('Can we continue with your order?');
  });

  it('keeps optional payment lines out when older callers omit them', () => {
    const result = buildIncomingOrderMessages({
      orderCode: 'AP-10',
      customerName: 'Taylor',
      phone: '4075550199',
      email: '',
      items: [{ name: 'Keychain', quantity: 1, total: 5 }],
      total: 5,
      language: 'en',
      whatsappNumber: '14708469271',
    });

    expect(result.whatsappMessage).not.toContain('Payment method:');
    expect(result.whatsappMessage).not.toContain('Payment status:');
    expect(result.whatsappUrl).toContain('https://wa.me/14708469271?text=');
  });
});
