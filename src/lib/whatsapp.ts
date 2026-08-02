export const APERFY_WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '14708469271';

export function buildWhatsAppOrderUrl(orderId: string, total: number, locale: 'en' | 'es' = 'en') {
  const message = locale === 'es'
    ? `Hola APERFY, quiero confirmar mi orden ${orderId}. Total estimado: $${total.toFixed(2)}.`
    : `Hi APERFY, I want to confirm order ${orderId}. Estimated total: $${total.toFixed(2)}.`;
  return `https://wa.me/${APERFY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

