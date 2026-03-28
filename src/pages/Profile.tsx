import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Save, Package, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { profileSchema, validateImageFile, sanitizeFileName } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, phone, avatar_url')
      .eq('id', user.id)
      .single()
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

    // Validate file
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
    if (!allowed) {
      toast({ title: t.profile.error, variant: 'destructive' });
      return;
    }

    const result = profileSchema.safeParse({ fullName, phone });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', user.id);
    if (error) {
      toast({ title: t.profile.error, variant: 'destructive' });
    } else {
      toast({ title: t.profile.saved });
    }
    setLoading(false);
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-2xl mx-auto px-4">
        <h1 className="font-display font-black text-3xl mb-8">{t.profile.title}</h1>

        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t.profile.avatar}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
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

        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t.profile.personalInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => navigate('/orders')} className="gap-2 h-auto py-4 border-border">
            <Package className="w-5 h-5" />
            <span>{t.orders.title}</span>
          </Button>
          <Button variant="outline" onClick={() => navigate('/favorites')} className="gap-2 h-auto py-4 border-border">
            <Heart className="w-5 h-5" />
            <span>{t.favorites.title}</span>
          </Button>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}
