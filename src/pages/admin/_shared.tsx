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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  );
}

export function AdminSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-[0_12px_34px_hsl(var(--foreground)/.06)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
