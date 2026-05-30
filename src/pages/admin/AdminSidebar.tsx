import { LayoutDashboard, Package, Tags, Layers, LogOut, ClipboardList, MessageSquare, CreditCard, Truck, ScrollText, Percent, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
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
    label: 'Overview',
    items: [{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Catalog',
    items: [
      { title: 'Products', url: '/admin/products', icon: Package },
      { title: 'Categories', url: '/admin/categories', icon: Tags },
      { title: 'Materials', url: '/admin/materials', icon: Layers },
      { title: 'AI 3D', url: '/admin/ai-3d', icon: Sparkles },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Orders', url: '/admin/orders', icon: ClipboardList },
      { title: 'Requests', url: '/admin/requests', icon: MessageSquare },
      { title: 'Discounts', url: '/admin/discounts', icon: Percent },
      { title: 'Shipping', url: '/admin/shipping', icon: Truck },
      { title: 'Payments', url: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    label: 'System',
    items: [{ title: 'Logs', url: '/admin/logs', icon: ScrollText }],
  },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="h-14 border-b border-border/60 px-3 flex items-center justify-center">
        <div className="flex items-center gap-2 w-full">
          <img src="/logo.png" alt="3DtoPrint" className="w-7 h-7 object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-display text-sm text-foreground truncate">
                3Dto<span className="text-gradient-gold">Print</span>
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                console
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/60 px-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-9 group/item">
                      <NavLink
                        to={item.url}
                        end
                        className="relative flex items-center gap-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="!text-foreground !bg-sidebar-accent/70 [&_.bar]:opacity-100"
                      >
                        <span className="bar absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-gradient-to-b from-primary to-primary/40 opacity-0 transition-opacity" />
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
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
              className="h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              {!collapsed && <span className="text-sm">Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
