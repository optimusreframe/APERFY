import { describe, expect, it } from 'vitest';
import { buildOrderInsert, getCheckoutErrorMessage, getCheckoutWhatsAppUrl } from './checkout';

describe('checkout order contract', () => {
  it('keeps the selected payment method in the order payload', () => {
    const payload = buildOrderInsert({
      userId: 'user-1',
      total: 18.15,
      paymentMethod: 'whatsapp',
      idempotencyKey: 'checkout-1',
      form: {
        fullName: 'Checkout Test',
        email: 'test@example.com',
        phone: '+15555550123',
        address: '123 Test Avenue',
        address2: '',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        country: 'United States',
        notes: '',
      },
      selectedShipping: null,
      shippingCost: 0,
      discountId: null,
      discountAmount: 0,
    });

    expect(payload).toMatchObject({
      user_id: 'user-1',
      payment_method: 'whatsapp',
      source: 'whatsapp',
      idempotency_key: 'checkout-1',
    });
  });

  it('surfaces structured Supabase errors instead of collapsing them to a generic message', () => {
    expect(getCheckoutErrorMessage({ message: 'column payment_method does not exist' }, 'Checkout failed'))
      .toBe('column payment_method does not exist');
  });

  it('opens the URL returned by the notification flow, not stale React state', () => {
    expect(getCheckoutWhatsAppUrl(null, 'https://wa.me/15555550123?text=order'))
      .toBe('https://wa.me/15555550123?text=order');
  });
});
