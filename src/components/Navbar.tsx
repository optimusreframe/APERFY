import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, LogIn, Shield, ShoppingCart, User, UserRound, Package, Heart, LogOut } from 'lucide-react';
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
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const prevItemCount = useRef(itemCount);
  const [cartBounce, setCartBounce] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (itemCount !== prevItemCount.current && itemCount > 0) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 400);
      prevItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  useEffect(() => {
    if (!user) { setAvatarUrl(''); setFullName(''); return; }
    supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url || '');
        setFullName(data?.full_name || '');
      });
  }, [user]);

  

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'md:top-2 md:left-4 md:right-4 navbar-floating-scrolled'
            : 'md:top-3 md:left-6 md:right-6 navbar-floating'
        }`}
      >
        <div className={`mx-auto transition-all duration-500 ${
          scrolled
            ? 'navbar-glass-scrolled md:rounded-2xl'
            : 'navbar-glass md:rounded-2xl'
        }`}>
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 ${
            scrolled ? 'h-14' : 'h-16'
          }`}>
            <div className="flex items-center justify-between h-full">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative w-9 h-9 bg-gradient-gold rounded-lg flex items-center justify-center shadow-gold group-hover:shadow-gold-lg transition-all duration-300 transform group-hover:[transform:rotateY(180deg)] [transition:transform_0.6s_ease]">
                    <span className="text-primary-foreground font-display font-black text-sm [backface-visibility:hidden]">3D</span>
                  </div>
                </div>
                <span className="font-display font-bold text-lg text-foreground tracking-tight">
                  3Dto<span className="text-gradient-gold">Print</span>
                </span>
              </Link>




              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/cart"
                  className={`relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 ${
                    cartBounce ? 'animate-[cart-bounce_0.4s_ease]' : ''
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-gold text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-gold"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </Link>

                <button
                  onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                >
                  <Globe className="w-4 h-4" />
                  <span className="font-medium uppercase text-xs">{language}</span>
                </button>

                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-secondary/50 transition-all outline-none">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm animate-[glow-pulse_3s_ease-in-out_infinite]" />
                          <Avatar className="w-8 h-8 relative ring-1 ring-primary/30">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-display">{initials}</AvatarFallback>
                          </Avatar>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 nav-dropdown border-primary/10">
                      {isAdmin ? (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="gap-2 cursor-pointer text-primary">
                              <Shield className="w-4 h-4" /> {t.nav.admin}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/profile" className="gap-2 cursor-pointer">
                              <User className="w-4 h-4" /> {t.profile.title}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/profile?tab=orders" className="gap-2 cursor-pointer">
                              <Package className="w-4 h-4" /> {t.orders.title}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/profile?tab=favorites" className="gap-2 cursor-pointer">
                              <Heart className="w-4 h-4" /> {t.favorites.title}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-muted-foreground hover:text-destructive">
                        <LogOut className="w-4 h-4" /> {t.nav.logout}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth" className="relative group ml-1">
                    <div className="absolute inset-0 rounded-full bg-primary/30 blur-md opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 animate-[glow-pulse_3s_ease-in-out_infinite]" />
                    <div className="relative w-10 h-10 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-gold-lg">
                      <UserRound className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </Link>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden text-foreground p-2 rounded-xl hover:bg-secondary/50 transition-all relative z-50"
              >
                <div className="w-5 h-5 relative">
                  <motion.span
                    animate={isOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }}
                    className="absolute left-0 top-1/2 w-full h-0.5 bg-current rounded-full origin-center"
                    transition={{ duration: 0.3 }}
                  />
                  <motion.span
                    animate={isOpen ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
                    className="absolute left-0 top-1/2 w-full h-0.5 bg-current rounded-full -translate-y-0.5"
                    transition={{ duration: 0.2 }}
                  />
                  <motion.span
                    animate={isOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }}
                    className="absolute left-0 top-1/2 w-full h-0.5 bg-current rounded-full origin-center"
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu - Slide from right */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-40 w-[280px] nav-glass-mobile md:hidden overflow-y-auto"
            >
              <div className="pt-20 px-6 pb-8 space-y-2">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                  >
                    <Link
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.href)
                          ? 'text-primary bg-primary/10 border border-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="pt-4 border-t border-border/30"
                >
                  <div className="flex items-center justify-between px-2">
                    <button
                      onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Globe className="w-4 h-4" />
                      {language === 'en' ? 'Español' : 'English'}
                    </button>
                    <Link to="/cart" onClick={() => setIsOpen(false)} className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                      <ShoppingCart className="w-5 h-5" />
                      {itemCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-gold text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {itemCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col gap-2 pt-4"
                >
                  {user ? (
                    <>
                      {isAdmin ? (
                        <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-primary hover:bg-primary/10">
                          <Shield className="w-4 h-4" /> {t.nav.admin}
                        </Link>
                      ) : (
                        <>
                          <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                            <User className="w-4 h-4" /> {t.profile.title}
                          </Link>
                          <Link to="/profile?tab=orders" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                            <Package className="w-4 h-4" /> {t.orders.title}
                          </Link>
                          <Link to="/profile?tab=favorites" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                            <Heart className="w-4 h-4" /> {t.favorites.title}
                          </Link>
                        </>
                      )}
                      <div className="pt-2 border-t border-border/30">
                        <Button variant="outline" size="sm" onClick={() => { signOut(); setIsOpen(false); }} className="w-full mt-2 gap-2 rounded-xl border-border/50">
                          <LogOut className="w-4 h-4" /> {t.nav.logout}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Link to="/auth" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-gold text-primary-foreground shadow-gold font-semibold text-sm justify-center">
                      <UserRound className="w-5 h-5" /> {t.nav.login}
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
