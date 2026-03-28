import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, LogIn, Shield, ShoppingCart, User, Package, Heart, LogOut } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!user) { setAvatarUrl(''); setFullName(''); return; }
    supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url || '');
        setFullName(data?.full_name || '');
      });
  }, [user]);

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/3dmodels', label: t.nav.models },
  ];

  const isActive = (path: string) => location.pathname === path;

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-glass backdrop-blur-xl border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-gold rounded-lg flex items-center justify-center shadow-gold group-hover:shadow-gold-lg transition-shadow">
              <span className="text-primary-foreground font-display font-black text-sm">3D</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              3Dto<span className="text-gradient-gold">Print</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.href)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/cart" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium uppercase">{language}</span>
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-all outline-none">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-display">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="gap-2 cursor-pointer">
                      <User className="w-4 h-4" /> {t.profile.title}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="gap-2 cursor-pointer">
                      <Package className="w-4 h-4" /> {t.orders.title}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites" className="gap-2 cursor-pointer">
                      <Heart className="w-4 h-4" /> {t.favorites.title}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="gap-2 cursor-pointer text-primary">
                          <Shield className="w-4 h-4" /> {t.nav.admin}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-muted-foreground hover:text-destructive">
                    <LogOut className="w-4 h-4" /> {t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <LogIn className="w-4 h-4" />
                    {t.nav.login}
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold font-semibold">
                    {t.nav.signup}
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground p-2">
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-glass border-t border-border/50 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                    isActive(link.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'Español' : 'English'}
                </button>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
                      <User className="w-4 h-4" /> {t.profile.title}
                    </Link>
                    <Link to="/orders" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
                      <Package className="w-4 h-4" /> {t.orders.title}
                    </Link>
                    <Link to="/favorites" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
                      <Heart className="w-4 h-4" /> {t.favorites.title}
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10">
                        <Shield className="w-4 h-4" /> {t.nav.admin}
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { signOut(); setIsOpen(false); }} className="mt-2 gap-2">
                      <LogOut className="w-4 h-4" /> {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/auth" className="flex-1" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">{t.nav.login}</Button>
                    </Link>
                    <Link to="/auth" className="flex-1" onClick={() => setIsOpen(false)}>
                      <Button size="sm" className="w-full bg-gradient-gold text-primary-foreground">{t.nav.signup}</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
