import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { Activity } from 'lucide-react';
import NotificationBell from '@/components/admin/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import Footer from '@/components/Footer';
import { useLanguage } from '@/i18n/LanguageContext';

const AUTO_RATE_SOURCES = ['bcv', 'laslucas', 'binance'] as const;

const routeLabels: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/products': 'products',
  '/admin/categories': 'categories',
  '/admin/inventory-import': 'inventoryImport',
  '/admin/variants': 'variants',
  '/admin/materials': 'variants',
  '/admin/orders': 'orders',
  '/admin/finance': 'finance',
  '/admin/requests': 'requests',
  '/admin/questions': 'questions',
  '/admin/payments': 'payments',
  '/admin/shipping': 'shipping',
  '/admin/discounts': 'discounts',
  '/admin/logs': 'logs',
  '/admin/ai-settings': 'integrations',
  '/admin/integrations': 'integrations',
  '/admin/notifications': 'notifications',
  '/admin/background-qa': 'backgroundQa',
  '/admin/homepage': 'homepage',
  '/admin/storefront-layout': 'storefrontLayout',
  '/admin/seo': 'seo',
};

export default function AdminLayout() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const ratesRefreshStarted = useRef(false);
  const currentKey = routeLabels[location.pathname] as keyof typeof t.admin.navigation.items | undefined;
  const current = currentKey ? t.admin.navigation.items[currentKey] : t.admin.console;
  const sessionId = 'SES-' + Math.floor(Date.now() / 1000).toString(36).toUpperCase().slice(-6);

  useEffect(() => {
    if (ratesRefreshStarted.current) return;
    ratesRefreshStarted.current = true;

    void Promise.allSettled(
      AUTO_RATE_SOURCES.map((source) => supabase.functions.invoke('storefront-pricing', { body: { action: 'refresh-rate', source } })),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['admin-currency-rates'] });
    });
  }, [queryClient]);

  return (
    <SidebarProvider>
      <div className="mac-admin-layout flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground">
        <AdminSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Command bar */}
          <header className="mac-admin-toolbar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
            <SidebarTrigger className="h-11 w-11 text-foreground/80 hover:text-foreground" />
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              <span>APERFY</span>
              <span className="text-border">/</span>
              <span className="text-foreground/90">{current}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <img src="/logo.png" alt="APERFY" className="h-7 w-7 shrink-0 object-contain" />
              <span className="aperfy-wordmark"><span>APER</span><span>FY</span></span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded border border-border/60 bg-card/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">EN VIVO</span>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <Activity className="w-3 h-3 text-primary/70" />
                <span>{sessionId}</span>
              </div>
              <LanguageToggle />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>
          <main className="mac-admin-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-6 lg:p-8">
            <Outlet />
            <Footer />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
