import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

    // Rate limit check
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

    // Validate
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        resetRateLimit('auth-login');
        navigate('/');
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
      // Mask error to prevent user enumeration
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Always show success to prevent email enumeration
    if (!error) {
      toast({ title: '✓', description: 'If that email exists, a reset link was sent.' });
    } else {
      toast({ title: '✓', description: 'If that email exists, a reset link was sent.' });
    }
  };

  const isThrottled = cooldown > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen pt-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl p-8 shadow-gold">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground">
                {isLogin ? t.auth.loginTitle : t.auth.signupTitle}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {isLogin ? t.auth.loginSubtitle : t.auth.signupSubtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t.auth.name}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      maxLength={100}
                      required
                    />
                  </div>
                  {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    maxLength={255}
                    required
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    maxLength={72}
                    required
                    minLength={6}
                  />
                </div>
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      maxLength={72}
                      required
                      minLength={6}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
                </div>
              )}

              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:underline"
                >
                  {t.auth.forgotPassword}
                </button>
              )}

              <Button
                type="submit"
                disabled={loading || isThrottled}
                className="w-full bg-gradient-gold text-primary-foreground font-semibold shadow-gold hover:opacity-90 gap-2"
              >
                {isThrottled && <ShieldAlert className="w-4 h-4" />}
                {loading ? '...' : isLogin ? t.auth.signIn : t.auth.signUp}
                {!isThrottled && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
              </span>
              <button
                onClick={() => { setIsLogin(!isLogin); setFieldErrors({}); }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? t.auth.signUp : t.auth.signIn}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
