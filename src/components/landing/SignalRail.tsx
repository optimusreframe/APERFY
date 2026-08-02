import { Check, Compass, MessageCircle, ShieldCheck } from 'lucide-react';

export default function SignalRail({ locale }: { locale: 'en' | 'es' }) {
  const stages = locale === 'es'
    ? [{ label: 'Encontrado', desc: 'Andrés detecta una oportunidad.', icon: Compass }, { label: 'Verificado', desc: 'La referencia de valor queda documentada.', icon: ShieldCheck }, { label: 'Listado', desc: 'La selección llega a APERFY.', icon: Check }, { label: 'Confirmado', desc: 'La orden pasa a conversación humana.', icon: MessageCircle }]
    : [{ label: 'Found', desc: 'Andrés spots a real opportunity.', icon: Compass }, { label: 'Verified', desc: 'The value reference is documented.', icon: ShieldCheck }, { label: 'Listed', desc: 'The selection reaches APERFY.', icon: Check }, { label: 'Confirmed', desc: 'The order moves to a human conversation.', icon: MessageCircle }];
  return <ol aria-label={locale === 'es' ? 'Cómo funciona APERFY' : 'How APERFY works'} className="grid gap-5 md:grid-cols-4">
    {stages.map(({ label, desc, icon: Icon }, index) => <li key={label} className="relative flex gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden="true" />{index < stages.length - 1 && <span className="absolute left-[calc(100%+0.75rem)] top-1/2 hidden h-px w-[calc(100%+1rem)] bg-primary/20 md:block" />}</div>
      <div><h3 className="font-semibold tracking-tight text-foreground">{label}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p></div>
    </li>)}
  </ol>;
}
