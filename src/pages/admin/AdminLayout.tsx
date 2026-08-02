import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { Activity } from 'lucide-react';
import NotificationBell from '@/components/admin/NotificationBell';

const routeLabels: Record<string, string> = {
  '/admin': 'DASHBOARD',
  '/admin/products': 'PRODUCTS',
  '/admin/categories': 'CATEGORIES',
  '/admin/variants': 'VARIANTS',
  '/admin/materials': 'VARIANTS',
  '/admin/orders': 'ORDERS',
  '/admin/requests': 'REQUESTS',
  '/admin/payments': 'PAYMENTS',
  '/admin/shipping': 'SHIPPING',
  '/admin/discounts': 'DISCOUNTS',
  '/admin/logs': 'LOGS',
  '/admin/ai-settings': 'AI PRODUCT INTELLIGENCE',
  '/admin/background-qa': 'BACKGROUND QA',
};

export default function AdminLayout() {
  const location = useLocation();
  const current = routeLabels[location.pathname] || 'Console';
  const sessionId = 'SES-' + Math.floor(Date.now() / 1000).toString(36).toUpperCase().slice(-6);

  return (
    <SidebarProvider>
      <div className="mac-admin-layout flex min-h-full w-full bg-[radial-gradient(circle_at_75%_0%,hsl(var(--primary)/.08),transparent_32%),linear-gradient(180deg,hsl(220_18%_9%),hsl(220_20%_6%))]">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Command bar */}
          <header className="mac-admin-toolbar sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-white/[0.08] px-4 bg-[hsl(220_18%_9%/.82)] backdrop-blur-2xl">
            <SidebarTrigger className="text-foreground/80 hover:text-foreground" />
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              <span>APERFY</span>
              <span className="text-border">/</span>
              <span className="text-foreground/90">{current}</span>
            </div>
            <div className="md:hidden font-display text-sm text-foreground">
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
              <NotificationBell />
            </div>
          </header>
          <main className="mac-admin-main flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
