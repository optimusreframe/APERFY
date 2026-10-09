export interface IncomingOrderMessageItem {
  name: string;
  quantity: number;
  total: number;
  variation?: string;
}

export interface IncomingOrderMessageInput {
  orderCode: string;
  customerName: string;
  phone: string;
  email: string;
  items: IncomingOrderMessageItem[];
  total: number;
  language: 'es' | 'en';
  whatsappNumber?: string;
  accountUrl?: string;
  shipping?: string;
  notes?: string;
  paymentMethod?: string;
  paymentState?: string;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('011')) return digits.slice(3);
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

const formatMoney = (amount: number) => `$${(Math.round(amount * 100) / 100).toFixed(2)}`;

const formatPaymentState = (paymentState: string, language: 'es' | 'en') => {
  const key = paymentState.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const labels: Record<string, { es: string; en: string }> = {
    pending: { es: 'Pendiente', en: 'Pending' },
    pending_payment: { es: 'Pendiente de pago', en: 'Payment pending' },
    awaiting_payment: { es: 'Pendiente de pago', en: 'Awaiting payment' },
    awaiting_confirmation: { es: 'Pendiente de confirmación', en: 'Awaiting confirmation' },
    paid: { es: 'Pagado', en: 'Paid' },
    received: { es: 'Recibido', en: 'Received' },
    confirmed: { es: 'Confirmado', en: 'Confirmed' },
    failed: { es: 'Fallido', en: 'Failed' },
    refunded: { es: 'Reembolsado', en: 'Refunded' },
  };
  return labels[key]?.[language] ?? paymentState.trim();
};

export function buildIncomingOrderMessages(input: IncomingOrderMessageInput) {
  const language = input.language;
  const phone = normalizePhone(input.phone);
  const whatsappNumber = normalizePhone(input.whatsappNumber || '');
  const itemLines = input.items.map((item) => {
    const variation = item.variation ? ` (${item.variation})` : '';
    return `- ${item.quantity} x ${item.name}${variation} - ${formatMoney(item.total)}`;
  });
  const receiptItemLines = input.items.map((item) => {
    const variation = item.variation ? ` (${item.variation})` : '';
    return `• ${item.quantity} × ${item.name}${variation} — ${formatMoney(item.total)}`;
  });
  const itemsTotal = input.items.reduce((sum, item) => sum + Math.round(item.total * 100), 0) / 100;
  const shipping = input.shipping?.trim();
  const notes = input.notes?.trim();
  const paymentMethod = input.paymentMethod?.trim();
  const paymentState = input.paymentState?.trim();
  const labels = language === 'es'
    ? {
        order: 'Orden', customer: 'Cliente', phone: 'Teléfono', items: 'Productos',
        subtotal: 'Subtotal de productos', total: 'Total del pedido', method: 'Método de pago',
        state: 'Estado del pago', notes: 'Notas', address: 'Dirección',
      }
    : {
        order: 'Order', customer: 'Customer', phone: 'Phone', items: 'Items',
        subtotal: 'Items subtotal', total: 'Order total', method: 'Payment method',
        state: 'Payment status', notes: 'Notes', address: 'Address',
      };

  const receiptDetails = [
    `${labels.order}: #${input.orderCode}`,
    `${labels.customer}: ${input.customerName}`,
    `${labels.phone}: ${input.phone}`,
    ...(input.email ? [`Email: ${input.email}`] : []),
    ...(shipping ? [`${labels.address}: ${shipping}`] : []),
    '',
    `${labels.items}:`,
    ...receiptItemLines,
    '',
    `${labels.subtotal}: ${formatMoney(itemsTotal)}`,
    `${labels.total}: ${formatMoney(input.total)}`,
    ...(paymentMethod ? [`${labels.method}: ${paymentMethod}`] : []),
    ...(paymentState ? [`${labels.state}: ${formatPaymentState(paymentState, language)}`] : []),
    ...(notes ? [`${labels.notes}: ${notes}`] : []),
  ];

  const whatsappMessage = [
    language === 'es'
      ? `Hola APERFY, soy ${input.customerName || 'un cliente'} y quiero coordinar este pedido.`
      : `Hi APERFY, I'm ${input.customerName || 'a customer'} and I want to coordinate this order.`,
    '',
    ...receiptDetails,
    '',
    language === 'es' ? 'Por favor confirmen mi pedido para continuar.' : 'Please confirm this order so we can continue.',
    ...(input.accountUrl ? ['', language === 'es' ? `Ver mi cuenta: ${input.accountUrl}` : `View my account: ${input.accountUrl}`] : []),
    '',
    "APERFY | Andres' Perfect Finds",
  ].join('\n');

  const customerWhatsAppMessage = [
    language === 'es'
      ? `Hola ${input.customerName}, hemos recibido tu nuevo pedido.`
      : `Hi ${input.customerName}, we received your new order.`,
    '',
    ...receiptDetails,
    '',
    language === 'es' ? '¿Nos confirmas que podemos continuar con tu pedido?' : 'Can we continue with your order?',
    ...(input.accountUrl ? ['', language === 'es' ? `Ver mi cuenta: ${input.accountUrl}` : `View my account: ${input.accountUrl}`] : []),
    '',
    "APERFY | Andres' Perfect Finds",
  ].join('\n');

  const telegramText = [
    'NUEVO PEDIDO APERFY', '',
    `Orden: #${input.orderCode}`,
    `Cliente: ${input.customerName}`,
    `Telefono: ${phone}`,
    `Email: ${input.email}`, '',
    ...itemLines, '',
    `Total estimado: ${formatMoney(input.total)}`,
    input.shipping ? `Shipping: ${input.shipping}` : '',
    input.notes ? `Notes: ${input.notes}` : '', '',
    'Estado: Pendiente de confirmacion por WhatsApp',
  ].filter(Boolean).join('\n');

  return {
    phone,
    whatsappMessage,
    whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : null,
    customerWhatsAppMessage,
    customerWhatsAppUrl: `https://wa.me/${phone}?text=${encodeURIComponent(customerWhatsAppMessage)}`,
    telegramText,
  };
}

export function buildTelegramCheckoutUrl(target: string | undefined, message: string, orderId: string): string {
  const fallback = new URL('https://t.me/share/url');
  fallback.searchParams.set('url', `https://aperfy.kpwr.dev/orders?order=${encodeURIComponent(orderId)}`);
  fallback.searchParams.set('text', message);
  if (!target?.trim()) return fallback.toString();

  const value = target.trim();
  if (/^\d+$/.test(value)) return fallback.toString();
  const normalized = value.startsWith('@') ? value.slice(1) : value;
  const destination = /^https?:\/\//i.test(normalized)
    ? new URL(normalized)
    : new URL(`https://t.me/${normalized.replace(/^\/+/, '')}`);
  destination.searchParams.set('text', message);
  return destination.toString();
}
