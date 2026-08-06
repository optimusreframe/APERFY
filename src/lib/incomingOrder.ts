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
  whatsappNumber: string;
  shipping?: string;
  notes?: string;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildIncomingOrderMessages(input: IncomingOrderMessageInput) {
  const phone = normalizePhone(input.phone);
  const whatsappNumber = normalizePhone(input.whatsappNumber);
  const itemLines = input.items.map((item) => {
    const variation = item.variation ? ` (${item.variation})` : '';
    return `- ${item.quantity} x ${item.name}${variation} - $${item.total.toFixed(2)}`;
  });
  const shippingLine = input.shipping ? `\nShipping: ${input.shipping}` : '';
  const notesLine = input.notes ? `\nNotes: ${input.notes}` : '';
  const whatsappMessage = input.language === 'es'
    ? [
        `Hola ${input.customerName}, hemos recibido tu pedido:`, '',
        ...itemLines, '', `Total estimado: $${input.total.toFixed(2)}`, shippingLine, notesLine, '',
        'Continuamos con el pedido?', '', "APERFY | Andres' Perfect Finds",
      ].join('\n')
    : [
        `Hi ${input.customerName}, we received your order:`, '',
        ...itemLines, '', `Estimated total: $${input.total.toFixed(2)}`, shippingLine, notesLine, '',
        'Shall we continue with the order?', '', "APERFY | Andres' Perfect Finds",
      ].join('\n');
  const telegramText = [
    'NUEVO PEDIDO APERFY', '',
    `Orden: #${input.orderCode}`,
    `Cliente: ${input.customerName}`,
    `Telefono: ${phone}`,
    `Email: ${input.email}`, '',
    ...itemLines, '',
    `Total estimado: $${input.total.toFixed(2)}`,
    input.shipping ? `Shipping: ${input.shipping}` : '',
    input.notes ? `Notes: ${input.notes}` : '', '',
    'Estado: Pendiente de confirmacion por WhatsApp',
  ].filter(Boolean).join('\n');

  return {
    phone,
    whatsappMessage,
    whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`,
    telegramText,
  };
}
