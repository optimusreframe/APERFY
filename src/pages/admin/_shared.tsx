import { ReactNode } from 'react';

export function AdminPageHeader({
  eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground uppercase">
          {title.toUpperCase()}
        </h1>
        {meta && <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground/70 mt-1.5">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function AdminSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-[hsl(220_17%_12%/.72)] shadow-[0_24px_80px_hsl(220_35%_2%/.22)] backdrop-blur-2xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
