import { LayoutDashboard, Package, Tags, Layers, LogOut, ClipboardList, MessageSquare, CreditCard, Truck, ScrollText, Percent, FlaskConical, Settings2, FileUp, LayoutTemplate, BellRing, DollarSign, MessageCircleQuestion, PanelsTopLeft, SearchCheck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const groups = [
  {
    label: 'overview',
    items: [{ key: 'dashboard', url: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'catalog',
    items: [
      { key: 'products', url: '/admin/products', icon: Package },
      { key: 'categories', url: '/admin/categories', icon: Tags },
      { key: 'inventoryImport', url: '/admin/inventory-import', icon: FileUp },
      { key: 'variants', url: '/admin/variants', icon: Layers },
    ],
  },
  {
    label: 'operations',
    items: [
      { key: 'orders', url: '/admin/orders', icon: ClipboardList },
      { key: 'finance', url: '/admin/finance', icon: DollarSign },
      { key: 'requests', url: '/admin/requests', icon: MessageSquare },
      { key: 'questions', url: '/admin/questions', icon: MessageCircleQuestion },
      { key: 'discounts', url: '/admin/discounts', icon: Percent },
      { key: 'shipping', url: '/admin/shipping', icon: Truck },
      { key: 'payments', url: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    label: 'system',
    items: [
      { key: 'logs', url: '/admin/logs', icon: ScrollText },
      { key: 'backgroundQa', url: '/admin/background-qa', icon: FlaskConical },
      { key: 'homepage', url: '/admin/homepage', icon: LayoutTemplate },
      { key: 'storefrontLayout', url: '/admin/storefront-layout', icon: PanelsTopLeft },
      { key: 'seo', url: '/admin/seo', icon: SearchCheck },
      { key: 'integrations', url: '/admin/integrations', icon: Settings2 },
      { key: 'notifications', url: '/admin/notifications', icon: BellRing },
    ],
  },
] as const;

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="h-full max-h-full min-h-0 border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-14 border-b border-border/60 px-3 flex items-center justify-center">
        <div className="flex items-center gap-2 w-full">
          <img src="/logo.png" alt="APERFY" className="w-7 h-7 object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <span className="aperfy-wordmark text-sm truncate"><span>APER</span><span>FY</span></span>
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                CONSOLE
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="min-h-0 overflow-y-auto overscroll-contain px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60 px-2">
                {t.admin.navigation.groups[group.label]}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild className="h-11 min-h-11 group/item">
                      <NavLink
                        to={item.url}
                        end
                        className="relative flex min-h-11 items-center gap-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="!text-foreground !bg-sidebar-accent/70 [&_.bar]:opacity-100"
                      >
                        <span className="bar absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-gradient-to-b from-primary to-primary/40 opacity-0 transition-opacity" />
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {!collapsed && <span className="truncate">{t.admin.navigation.items[item.key]}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="h-11 min-h-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              {!collapsed && <span className="text-sm">{t.nav.logout}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
