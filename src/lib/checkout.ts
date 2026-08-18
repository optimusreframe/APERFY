export interface CheckoutFormValues {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

interface BuildOrderInsertParams {
  userId: string;
  total: number;
  paymentMethod: string;
  idempotencyKey: string;
  form: CheckoutFormValues;
  selectedShipping: string | null;
  shippingCost: number;
  discountId: string | null;
  discountAmount: number;
}

export function buildOrderInsert({
  userId,
  total,
  paymentMethod,
  idempotencyKey,
  form,
  selectedShipping,
  shippingCost,
  discountId,
  discountAmount,
}: BuildOrderInsertParams) {
  return {
    user_id: userId,
    total,
    notes: form.notes || null,
    payment_method: paymentMethod,
    source: paymentMethod === 'whatsapp' ? 'whatsapp' : 'website',
    idempotency_key: idempotencyKey,
    shipping_address: {
      full_name: form.fullName || '',
      email: form.email || '',
      phone: form.phone || '',
      address: form.address || '',
      address2: form.address2 || '',
      city: form.city || '',
      state: form.state || '',
      zip_code: form.zipCode || '',
      country: form.country || '',
    },
    shipping_provider_id: selectedShipping,
    shipping_cost: shippingCost,
    discount_code_id: discountId,
    discount_amount: discountAmount,
  };
}

export function getCheckoutErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (!error || typeof error !== 'object') return fallback;

  const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const details = typeof candidate.details === 'string' ? candidate.details : '';
  const hint = typeof candidate.hint === 'string' ? candidate.hint : '';
  return [message, details, hint].filter(Boolean).join(' — ') || fallback;
}

export function getCheckoutWhatsAppUrl(currentUrl: string | null, returnedUrl: string | null): string | null {
  return returnedUrl || currentUrl;
}
