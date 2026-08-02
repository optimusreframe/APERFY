import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, User, Package, Heart, LogOut, Camera, Save, Box, ShoppingBag, ChevronDown, ChevronUp, ChevronRight, TrendingUp, ThumbsUp, Gift, Mail, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { profileSchema, validateImageFile, sanitizeFileName } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { useIsMobile } from '@/hooks/use-mobile';
import ReferralsTab from '@/components/profile/ReferralsTab';

const tabs = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'profile', icon: User },
  { id: 'orders', icon: Package },
  { id: 'favorites', icon: Heart },
  { id: 'referrals', icon: Gift },
] as const;

type TabId = typeof tabs[number]['id'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  printing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

// ─── Overview Tab ───────────────────────────────────────────
function OverviewTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: stats } = useQuery({
    queryKey: ['user-dashboard-stats', user?.id],
    queryFn: async () => {
      const [ordersRes, favsRes, likesRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('product_likes').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      return { orders: ordersRes.count || 0, favorites: favsRes.count || 0, likes: likesRes.count || 0 };
    }, enabled: !!user,
  });
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'AP';
  const rows = [
    { label: t.profile.totalOrders, value: stats?.orders ?? 0, icon: Package, tab: 'orders' as TabId },
    { label: t.profile.totalFavorites, value: stats?.favorites ?? 0, icon: Heart, tab: 'favorites' as TabId },
    { label: t.profile.totalLikes, value: stats?.likes ?? 0, icon: ThumbsUp, tab: 'overview' as TabId },
  ];
  return <div className="space-y-5">
    <Card className="overflow-hidden border-white/[0.09] bg-[linear-gradient(135deg,hsl(220_20%_15%/.96),hsl(220_19%_11%/.82))] shadow-[0_20px_60px_hsl(220_35%_2%/.28)]"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/[0.12] text-lg font-semibold text-primary">{initials}</div><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">APERFY ID</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{t.profile.welcomeBack}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />{user?.email}</p></div></div><div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-2 text-xs text-primary"><ShieldCheck className="h-3.5 w-3.5" />{t.profile.overviewSubtitle}</div></CardContent></Card>
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-xl"><div className="flex items-center justify-between px-2 pb-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">APERFY · OVERVIEW</p><h2 className="mt-1 text-base font-semibold">{t.profile.overview}</h2></div><span className="hidden text-[11px] text-muted-foreground sm:block">{t.profile.overviewSubtitle}</span></div><div className="grid gap-2 md:grid-cols-3">{rows.map((row, i) => <motion.button key={row.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} onClick={() => onNavigate(row.tab)} className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/10 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.06]"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground group-hover:text-primary"><row.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xl font-semibold leading-none">{row.value}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{row.label}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" /></motion.button>)}</div></section>
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]"><div className="border-b border-white/[0.07] px-4 py-3"><h2 className="text-sm font-semibold">{t.profile.title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t.profile.overviewSubtitle}</p></div><div className="divide-y divide-white/[0.07]"><button onClick={() => onNavigate('orders')} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.1] text-primary"><Package className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-medium">{t.orders.title}</span><span className="block text-xs text-muted-foreground">{t.profile.totalOrders}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" /></button><button onClick={() => onNavigate('favorites')} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.1] text-primary"><Heart className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-medium">{t.favorites.title}</span><span className="block text-xs text-muted-foreground">{t.profile.totalFavorites}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" /></button></div></section>
  </div>;
}

function LegacyOverviewTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: stats } = useQuery({
    queryKey: ['user-dashboard-stats', user?.id],
    queryFn: async () => {
      const [ordersRes, favsRes, likesRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('product_likes').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      return {
        orders: ordersRes.count || 0,
        favorites: favsRes.count || 0,
        likes: likesRes.count || 0,
      };
    },
    enabled: !!user,
  });

  const statCards = [
    { label: t.profile.totalOrders, value: stats?.orders ?? 0, icon: Package, tab: 'orders' as TabId, gradient: 'from-blue-500/20 to-cyan-500/10' },
    { label: t.profile.totalFavorites, value: stats?.favorites ?? 0, icon: Heart, tab: 'favorites' as TabId, gradient: 'from-pink-500/20 to-rose-500/10' },
    { label: t.profile.totalLikes, value: stats?.likes ?? 0, icon: ThumbsUp, tab: 'overview' as TabId, gradient: 'from-amber-500/20 to-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-card to-secondary/50 border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <CardContent className="p-6 sm:p-8">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground">
            {t.profile.welcomeBack} 👋
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{t.profile.overviewSubtitle}</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <button
              onClick={() => onNavigate(stat.tab)}
              className="w-full text-left"
            >
              <Card className={`bg-gradient-to-br ${stat.gradient} border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-gold group cursor-pointer`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <div className="font-display font-black text-3xl text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => onNavigate('orders')} className="gap-2 h-auto py-4 border-border/50 hover:border-primary/30 hover:shadow-gold transition-all">
          <Package className="w-5 h-5" />
          <span>{t.orders.title}</span>
        </Button>
        <Button variant="outline" onClick={() => onNavigate('favorites')} className="gap-2 h-auto py-4 border-border/50 hover:border-primary/30 hover:shadow-gold transition-all">
          <Heart className="w-5 h-5" />
          <span>{t.favorites.title}</span>
        </Button>
      </div>
    </div>
  );
}

// ─── Profile Tab ────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
          setAvatarUrl(data.avatar_url || '');
        }
      });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validation = await validateImageFile(file, 2);
    if (!validation.valid) {
      toast({ title: validation.error || t.profile.error, variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = sanitizeFileName(`avatar.${ext}`);
    const path = `${user.id}/${safeName}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: t.profile.error, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      toast({ title: t.profile.avatarUpdated });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setFieldErrors({});
    const { allowed } = checkRateLimit('profile-save', 10, 60 * 1000);
    if (!allowed) { toast({ title: t.profile.error, variant: 'destructive' }); return; }
    const result = profileSchema.safeParse({ fullName, phone });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
    if (error) { toast({ title: t.profile.error, variant: 'destructive' }); }
    else { toast({ title: t.profile.saved }); }
    setLoading(false);
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-20 h-20 ring-2 ring-primary/20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-display">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="text-sm text-muted-foreground">
            {uploading ? t.profile.uploading : t.profile.changeAvatar}
            <p className="text-xs mt-1">JPG, PNG, WebP · Max 2MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-display font-bold text-lg">{t.profile.personalInfo}</h3>
          <div>
            <Label>{t.profile.email}</Label>
            <Input value={user?.email || ''} disabled className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>{t.profile.fullName}</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-card border-border mt-1" maxLength={100} />
            {fieldErrors.fullName && <p className="text-xs text-destructive mt-1">{fieldErrors.fullName}</p>}
          </div>
          <div>
            <Label>{t.profile.phone}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-card border-border mt-1" maxLength={20} />
            {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-gold text-primary-foreground gap-2">
            <Save className="w-4 h-4" />
            {loading ? '...' : t.profile.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Orders Tab ─────────────────────────────────────────────
function OrdersTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['my-order-items', expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase.from('order_items').select('*, products(name_en, name_es, images, slug)').eq('order_id', expandedOrder!);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedOrder,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-5 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">{t.orders.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any, i: number) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/20 transition-all"
        >
          <button
            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Package className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-display font-semibold text-foreground">
                  {t.orders.order} #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={statusColors[order.status] || ''}>
                {t.orders.statuses[order.status as keyof typeof t.orders.statuses]}
              </Badge>
              <span className="font-bold text-gradient-gold">${Number(order.total).toFixed(2)}</span>
              {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {expandedOrder === order.id && (
            <div className="border-t border-border/50 p-5 space-y-3">
              {orderItems.map((item: any) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                    {(item.products?.images as string[])?.[0] && (
                      <img src={(item.products.images as string[])[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.products?.name_en}</p>
                    <p className="text-muted-foreground">x{item.quantity} · ${Number(item.unit_price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Favorites Tab ──────────────────────────────────────────
function FavoritesTab() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const { data: favoriteProducts = [], isLoading, refetch } = useQuery({
    queryKey: ['favorite-products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: favs, error: favErr } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
      if (favErr) throw favErr;
      if (!favs.length) return [];
      const ids = favs.map(f => f.product_id);
      const { data, error } = await supabase.from('products').select('*').in('id', ids);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const removeFavorite = async (productId: string) => {
    if (!user) return;
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    refetch();
    toast({ title: t.favorites.removed });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (favoriteProducts.length === 0) {
    return (
      <div className="text-center py-20">
        <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-4">{t.favorites.empty}</p>
        <Link to="/products">
          <Button className="bg-gradient-gold text-primary-foreground gap-2">
            <ShoppingBag className="w-4 h-4" />
            {t.favorites.browseStore}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
      {favoriteProducts.map((product: any, i: number) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group"
        >
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold relative">
            <Link to={`/products/${product.slug}`}>
              <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                {(product.images as string[])?.length > 0 ? (
                  <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Box className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </Link>
            <button
              onClick={() => removeFavorite(product.id)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/20 transition-colors"
            >
              <Heart className="w-4 h-4 fill-primary text-primary" />
            </button>
            <div className="p-3">
              <Link to={`/products/${product.slug}`}>
                <h3 className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {language === 'es' ? product.name_es : product.name_en}
                </h3>
              </Link>
              <div className="mt-1 text-sm font-bold text-gradient-gold">
                ${Number(product.base_price).toFixed(2)}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const activeTab = (searchParams.get('tab') as TabId) || 'overview';

  const setActiveTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: true });
  };

  const tabLabels: Record<TabId, string> = {
    overview: t.profile.overview,
    profile: t.profile.title,
    orders: t.orders.title,
    favorites: t.favorites.title,
    referrals: (t.profile as any).referrals || 'Referidos',
  };

  return (
    <div className="min-h-full bg-transparent">
      <Navbar />
      <div className="px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] px-1 pb-4">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">APERFY · ACCOUNT CENTER</p><h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{t.profile.title}</h1></div>
            <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-xs text-primary sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />{t.profile.welcomeBack}</div>
          </div>
          <div className="flex gap-5 lg:gap-8">
            {/* Desktop Sidebar */}
            {!isMobile && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-60 shrink-0"
              >
                <div className="sticky top-4 space-y-1 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 backdrop-blur-xl">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                          isActive
                            ? 'text-primary bg-primary/[0.12] border border-primary/25 shadow-[0_0_24px_hsl(var(--primary)/.08)]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tabLabels[tab.id]}
                      </button>
                    );
                  })}
                  <div className="mt-4 border-t border-white/[0.08] pt-4">
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.nav.logout}
                    </button>
                  </div>
                </div>
              </motion.aside>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Mobile Tab Bar */}
              {isMobile && (
                <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-primary/[0.12] text-primary border border-primary/25'
                            : 'bg-white/[0.04] text-muted-foreground border border-white/[0.08]'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tabLabels[tab.id]}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
                  {activeTab === 'profile' && <ProfileTab />}
                  {activeTab === 'orders' && <OrdersTab />}
                  {activeTab === 'favorites' && <FavoritesTab />}
                  {activeTab === 'referrals' && <ReferralsTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
