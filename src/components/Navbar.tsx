import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, LogIn, LogOut, Shield } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/3dmodels', label: t.nav.models },
  ];

  const isActive = (path: string) => location.pathname === path;

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
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium uppercase">{language}</span>
            </button>

            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                      <Shield className="w-4 h-4" />
                      {t.nav.admin}
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4" />
                  {t.nav.logout}
                </Button>
              </>
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
              <div className="flex gap-2 pt-2">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" className="flex-1" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Shield className="w-4 h-4" />Admin
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { signOut(); setIsOpen(false); }} className="flex-1">
                      {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="flex-1" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">{t.nav.login}</Button>
                    </Link>
                    <Link to="/auth" className="flex-1" onClick={() => setIsOpen(false)}>
                      <Button size="sm" className="w-full bg-gradient-gold text-primary-foreground">{t.nav.signup}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
