import { BadgeCheck, Boxes, MessageCircle } from 'lucide-react';

export default function TrustInstrumentation({ locale }: { locale: 'en' | 'es' }) {
  const items = locale === 'es'
    ? [{ title: 'Valor verificable', desc: 'La comparación solo aparece cuando existe evidencia.', icon: BadgeCheck }, { title: 'Inventario real', desc: 'Lo disponible refleja la selección actual, no una promesa eterna.', icon: Boxes }, { title: 'Compra humana', desc: 'Creamos tu orden y la confirmamos por WhatsApp.', icon: MessageCircle }]
    : [{ title: 'Verifiable value', desc: 'Comparisons appear only when evidence exists.', icon: BadgeCheck }, { title: 'Real inventory', desc: 'Availability reflects the current selection, not an endless promise.', icon: Boxes }, { title: 'Human checkout', desc: 'We create your order and confirm it through WhatsApp.', icon: MessageCircle }];
  return <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">{items.map(({ title, desc, icon: Icon }) => <div key={title} className="bg-card p-5 sm:p-6"><Icon className="h-5 w-5 text-primary" aria-hidden="true" /><h3 className="mt-4 font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p></div>)}</div>;
}
