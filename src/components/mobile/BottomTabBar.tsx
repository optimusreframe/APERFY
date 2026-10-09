import { Link, useLocation } from 'react-router-dom';
import { Home, Sparkles, ShoppingBag, Heart, User as UserIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

/**
 * Compact app tab row for phone and tablet shell layouts.
 * - Hides on admin routes.
 * - Uses safe-area-inset-bottom for notch devices.
 */
export default function BottomTabBar() {
  const location = useLocation();
  const { itemCount } = useCart();
  const { user, isAdmin } = useAuth();

  if (location.pathname.startsWith('/admin')) return null;
  if (location.pathname.startsWith('/auth')) return null;

  const tabs = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/ask', icon: Sparkles, label: 'Ask\nAPERFY', multiline: true },
    { to: '/cart', icon: ShoppingBag, label: 'Carrito', badge: itemCount },
    { to: '/profile?tab=favorites', icon: Heart, label: 'Favoritos', match: '/profile' },
    { to: user ? '/profile' : '/auth', icon: UserIcon, label: user ? 'Yo' : 'Entrar' },
  ];

  if (isAdmin) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="mac-bottom-tabs relative z-[70] shrink-0 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
        <div
          className="mx-auto mb-2 w-[calc(100%-1rem)] max-w-xl rounded-2xl border border-white/[0.06] backdrop-blur-2xl"
          style={{
            background: 'hsl(240 8% 6% / 0.85)',
            boxShadow: '0 12px 40px -8px hsl(0 0% 0% / 0.5), 0 0 0 1px hsl(43 76% 53% / 0.06)',
          }}
        >
          <ul className="flex h-14 items-stretch justify-around px-1">
            {tabs.map((tab) => {
              const path = tab.to.split('?')[0];
              const active =
                tab.match
                  ? location.pathname === tab.match &&
                    (tab.to.includes('?tab=favorites')
                      ? location.search.includes('favorites')
                      : !location.search.includes('favorites'))
                  : location.pathname === path;
              return (
                <li key={tab.to} className="flex-1">
                  <Link
                    to={tab.to}
                    aria-current={active ? 'page' : undefined}
                    className="relative flex h-full min-h-11 min-w-11 w-full flex-col items-center justify-center gap-0.5 touch-manipulation transition-transform active:scale-95"
                  >
                    {active && (
                      <motion.span
                        layoutId="tabbar-active"
                        className="absolute inset-x-3 top-1 h-[3px] rounded-full bg-gradient-gold"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="relative" {...(path === '/cart' ? { 'data-mobile-cart-icon': 'true' } : {})}>
                      <tab.icon
                        className={`w-[22px] h-[22px] transition-colors ${
                          active ? 'text-primary' : 'text-muted-foreground'
                        }`}
                        strokeWidth={active ? 2.4 : 1.8}
                      />
                      {tab.badge && tab.badge > 0 ? (
                        <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-gold text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      ) : null}
                    </div>
                    {tab.multiline ? (
                      <span
                        className={`text-[9px] font-semibold tracking-tight leading-[1] text-center whitespace-pre ${
                          active ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                      >
                        {tab.label}
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-medium tracking-tight ${
                          active ? 'text-primary' : 'text-muted-foreground/80'
                        }`}
                      >
                        {tab.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
    </nav>
  );
}
