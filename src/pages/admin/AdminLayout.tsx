import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { Activity } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/materials': 'Materials',
  '/admin/orders': 'Orders',
  '/admin/requests': 'Requests',
  '/admin/payments': 'Payments',
  '/admin/shipping': 'Shipping',
  '/admin/logs': 'Logs',
};

export default function AdminLayout() {
  const location = useLocation();
  const current = routeLabels[location.pathname] || 'Console';
  const sessionId = 'SES-' + Math.floor(Date.now() / 1000).toString(36).toUpperCase().slice(-6);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Command bar */}
          <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border/60 px-4 bg-background/70 backdrop-blur-xl">
            <SidebarTrigger className="text-foreground/80 hover:text-foreground" />
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              <span>console</span>
              <span className="text-border">/</span>
              <span className="text-foreground/90">{current.toLowerCase()}</span>
            </div>
            <div className="md:hidden font-display text-sm text-foreground">
              3Dto<span className="text-gradient-gold">Print</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded border border-border/60 bg-card/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">live</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <Activity className="w-3 h-3 text-primary/70" />
                <span>{sessionId}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
