import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Boxes, Home, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCart } from '@/contexts/CartContext';

type MacAppShellProps = { children: ReactNode };

export default function MacAppShell({ children }: MacAppShellProps) {
  const { language } = useLanguage();
  const { itemCount } = useCart();
  const location = useLocation();
  const es = language === 'es';
  const links = [
    { to: '/', label: es ? 'Inicio' : 'Home', icon: Home },
    { to: '/catalog', label: es ? 'Disponible ahora' : 'Available now', icon: Boxes },
    { to: '/our-process', label: es ? 'Cómo funciona' : 'How it works', icon: Sparkles },
    { to: '/cart', label: es ? 'Carrito' : 'Cart', icon: ShoppingBag, count: itemCount },
    { to: '/profile', label: es ? 'Cuenta' : 'Account', icon: UserRound },
  ];

  return <div className="mac-workspace min-h-screen px-0 py-0 text-foreground sm:px-4 sm:py-4 lg:px-8 lg:py-8">
    <div className="mac-window mx-auto flex min-h-screen max-w-[1480px] overflow-hidden sm:min-h-[calc(100vh-2rem)] sm:rounded-[1.25rem] sm:border sm:border-white/[0.08] sm:shadow-[0_32px_100px_hsl(160_60%_4%/.55)] lg:min-h-[calc(100vh-4rem)]">
      <aside className="mac-sidebar hidden w-[220px] shrink-0 flex-col border-r border-white/[0.07] px-3 py-4 md:flex" aria-label={es ? 'Navegación de tienda' : 'Store navigation'}>
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-3" aria-label="APERFY Store home">
          <img src="/logo.png" alt="APERFY" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-[-.02em]">APERFY Store</span>
        </Link>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">{es ? 'Comprar' : 'Shop'}</div>
        <nav className="space-y-1" aria-label={es ? 'Navegación de tienda' : 'Store navigation'}>
          {links.slice(0, 4).map(({ to, label, icon: Icon, count }) => <Link key={to} to={to} className={`mac-nav-item ${location.pathname === to ? 'is-active' : ''}`}><Icon className="h-4 w-4" /><span>{label}</span>{typeof count === 'number' && count > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{count}</span>}</Link>)}
        </nav>
        <div className="mb-2 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">{es ? 'Tu espacio' : 'Your space'}</div>
        <nav><Link to="/profile" className={`mac-nav-item ${location.pathname === '/profile' ? 'is-active' : ''}`}><UserRound className="h-4 w-4" /><span>{es ? 'Cuenta' : 'Account'}</span></Link></nav>
        <div className="mt-auto rounded-xl border border-primary/20 bg-primary/[0.07] p-3"><p className="text-xs font-semibold">{es ? 'Nuevos productos cada día' : 'New products every day'}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{es ? 'Lo publicado es lo disponible.' : 'What is published is what is available.'}</p></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mac-titlebar flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 sm:px-5" aria-label="APERFY Store">
          <div className="mac-traffic-lights hidden items-center gap-2 sm:flex" aria-hidden="true"><span className="mac-light bg-[#ff5f57]" /><span className="mac-light bg-[#febc2e]" /><span className="mac-light bg-[#28c840]" /></div>
          <Link to="/" className="flex items-center gap-2 md:hidden"><img src="/logo.png" alt="APERFY" className="h-7 w-7 rounded-lg object-contain" /><span className="text-sm font-semibold">APERFY Store</span></Link>
          <div className="hidden flex-1 items-center justify-center md:flex"><span className="text-xs font-medium tracking-[.02em] text-muted-foreground">{es ? 'APERFY Store · productos disponibles ahora' : 'APERFY Store · products available now'}</span></div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />{es ? 'En vivo' : 'Live'}</div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  </div>;
}
