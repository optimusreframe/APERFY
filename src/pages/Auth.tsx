import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { loginSchema, signupSchema } from '@/lib/validation';
import { checkRateLimit, resetRateLimit, formatRetryTime } from '@/lib/rate-limit';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const rlKey = isLogin ? 'auth-login' : 'auth-signup';
    const { allowed, retryAfterMs } = checkRateLimit(rlKey, 5, 5 * 60 * 1000);
    if (!allowed) {
      setCooldown(retryAfterMs);
      toast({
        title: t.auth.rateLimited || 'Too many attempts',
        description: `${t.auth.tryAgainIn || 'Try again in'} ${formatRetryTime(retryAfterMs)}`,
        variant: 'destructive',
      });
      return;
    }

    if (isLogin) {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
        setFieldErrors(errs);
        return;
      }
    } else {
      const result = signupSchema.safeParse({ email, password, confirmPassword, fullName });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
        setFieldErrors(errs);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        resetRateLimit('auth-login');
        // Check if user is admin to redirect accordingly
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        navigate(roleData ? '/admin' : '/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        resetRateLimit('auth-signup');
        toast({ title: '✓', description: 'Check your email to confirm your account.' });
      }
    } catch (error: any) {
      const genericMsg = isLogin
        ? (t.auth.invalidCredentials || 'Invalid email or password')
        : (error.message || 'An error occurred');
      toast({ title: 'Error', description: genericMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: 'Error', description: 'Enter your email first', variant: 'destructive' });
      return;
    }
    const { allowed } = checkRateLimit('auth-reset', 3, 10 * 60 * 1000);
    if (!allowed) {
      toast({ title: t.auth.rateLimited || 'Too many attempts', variant: 'destructive' });
      return;
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    toast({ title: '✓', description: 'If that email exists, a reset link was sent.' });
  };

  const isThrottled = cooldown > 0;

  const inputClass =
    "w-full pl-11 pr-4 py-3.5 rounded-xl bg-[hsl(240_8%_6%)] border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:shadow-[0_0_12px_-3px_hsl(43_76%_53%/0.3)] transition-all duration-300 text-sm shadow-[inset_0_2px_4px_hsl(0_0%_0%/0.3)]";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[100px]" />
        
        {/* Floating geometric shapes */}
        <motion.div
          animate={{ rotate: 360, y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[15%] left-[10%] w-16 h-16 border border-primary/[0.08] rounded-lg opacity-40"
          style={{ transform: 'perspective(200px) rotateX(45deg) rotateZ(45deg)' }}
        />
        <motion.div
          animate={{ rotate: -360, y: [0, 20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[25%] right-[12%] w-12 h-12 border border-primary/[0.06] rounded-md opacity-30"
          style={{ transform: 'perspective(200px) rotateY(45deg) rotateZ(30deg)' }}
        />
        <motion.div
          animate={{ rotate: 180, y: [0, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] left-[15%] w-10 h-10 border border-primary/[0.07] rounded-sm opacity-30"
          style={{ transform: 'perspective(200px) rotateX(60deg)' }}
        />
        <motion.div
          animate={{ rotate: -180, y: [0, 25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[25%] right-[18%] w-14 h-14 border border-primary/[0.05] rounded-lg opacity-25"
          style={{ transform: 'perspective(200px) rotateY(30deg) rotateX(20deg)' }}
        />
      </div>

      <div className="flex items-center justify-center min-h-screen pt-16 px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotateX: -8 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
          style={{ perspective: '1200px' }}
        >
          {/* Gold gradient border wrapper */}
          <div className="relative p-[1px] rounded-3xl bg-gradient-to-br from-primary/40 via-primary/10 to-primary/30 shadow-[0_25px_80px_-20px_hsl(0_0%_0%/0.6),0_0_40px_-10px_hsl(43_76%_53%/0.15)]">
            
            {/* Inner card */}
            <div className="bg-card rounded-3xl p-8 relative overflow-hidden">
              
              {/* Shimmer effect on card */}
              <div className="absolute inset-0 shimmer-gold pointer-events-none rounded-3xl" />

              {/* Logo */}
              <div className="flex flex-col items-center mb-8 relative z-10">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg opacity-60 animate-[glow-pulse_3s_ease-in-out_infinite]" />
                  <img src="/logo.png" alt="3DtoPrint" className="relative w-14 h-14 object-contain" />
                </div>
                <span className="font-display font-bold text-xl text-foreground tracking-tight">
                  3Dto<span className="text-gradient-gold">Print</span>
                </span>
              </div>

              {/* Title */}
              <div className="text-center mb-8 relative z-10">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {isLogin ? t.auth.loginTitle : t.auth.signupTitle}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  {isLogin ? t.auth.loginSubtitle : t.auth.signupSubtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10" noValidate>
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="name-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="name" className="text-sm font-medium text-foreground/80">{t.auth.name}</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          id="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={inputClass}
                          maxLength={100}
                          required
                        />
                      </div>
                      {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground/80">{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      maxLength={255}
                      required
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground/80">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      maxLength={72}
                      required
                      minLength={6}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
                </div>

                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="confirm-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">{t.auth.confirmPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputClass}
                          maxLength={72}
                          required
                          minLength={6}
                        />
                      </div>
                      {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-primary hover:text-gold-light transition-colors"
                  >
                    {t.auth.forgotPassword}
                  </button>
                )}

                {/* Premium 3D submit button */}
                <Button
                  type="submit"
                  disabled={loading || isThrottled}
                  className="relative w-full py-6 rounded-xl bg-gradient-gold text-primary-foreground font-display font-semibold text-base shadow-[0_8px_30px_-8px_hsl(43_76%_53%/0.5),0_4px_6px_-2px_hsl(0_0%_0%/0.3)] hover:shadow-[0_12px_40px_-8px_hsl(43_76%_53%/0.6),0_6px_10px_-4px_hsl(0_0%_0%/0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shimmer-gold overflow-hidden gap-2"
                >
                  {isThrottled && <ShieldAlert className="w-4 h-4" />}
                  {loading ? '...' : isLogin ? t.auth.signIn : t.auth.signUp}
                  {!isThrottled && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              {/* Toggle login/signup */}
              <div className="mt-8 text-center text-sm relative z-10">
                <span className="text-muted-foreground">
                  {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
                </span>
                <button
                  onClick={() => { setIsLogin(!isLogin); setFieldErrors({}); }}
                  className="text-primary hover:text-gold-light font-semibold transition-colors"
                >
                  {isLogin ? t.auth.signUp : t.auth.signIn}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
