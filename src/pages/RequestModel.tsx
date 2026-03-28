import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Link as LinkIcon, Send, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitize';
import { validateFileUpload } from '@/lib/validation';

const requestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(30),
  product_name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  reference_url: z.string().trim().url().max(500).optional().or(z.literal('')),
});

export default function RequestModel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', product_name: '', description: '', reference_url: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (const file of Array.from(files)) {
      const validation = validateFileUpload(file, 5);
      if (!validation.valid) {
        toast({ title: validation.error, variant: 'destructive' });
        continue;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }
    setImages(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [toast]);

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = requestSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Upload images
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('model-request-images').upload(path, file);
        if (error) {
          toast({ title: t.requestModel.errorUpload, variant: 'destructive' });
          continue;
        }
        const { data: { publicUrl } } = supabase.storage.from('model-request-images').getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }

      const sanitized = {
        name: sanitizeText(parsed.data.name),
        email: parsed.data.email,
        phone: sanitizeText(parsed.data.phone),
        product_name: sanitizeText(parsed.data.product_name),
        description: parsed.data.description ? sanitizeText(parsed.data.description) : null,
        reference_url: parsed.data.reference_url || null,
        images: uploadedUrls,
      };

      const { error } = await supabase.from('model_requests').insert(sanitized);
      if (error) throw error;

      setSuccess(true);
    } catch {
      toast({ title: t.requestModel.errorSubmit, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', product_name: '', description: '', reference_url: '' });
    setImages([]);
    setPreviews([]);
    setSuccess(false);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="font-display font-black text-4xl sm:text-5xl mb-4">
              {t.requestModel.title}{' '}
              <span className="text-gradient-gold">{t.requestModel.titleHighlight}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.requestModel.subtitle}</p>
          </motion.div>

          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center p-12 rounded-2xl bg-card border border-border/50"
            >
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="font-display font-bold text-2xl mb-4">{t.requestModel.successTitle}</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t.requestModel.successMessage}</p>
              <Button onClick={resetForm} className="bg-gradient-gold text-primary-foreground font-semibold">
                {t.requestModel.sendAnother}
              </Button>
            </motion.div>
          ) : (
            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              onSubmit={handleSubmit}
              className="space-y-6 p-8 rounded-2xl bg-card border border-border/50"
            >
              {/* Contact Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.requestModel.nameLabel} *</Label>
                  <Input id="name" name="name" value={form.name} onChange={handleChange}
                    placeholder={t.requestModel.namePlaceholder} className={errors.name ? 'border-destructive' : ''} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.requestModel.emailLabel} *</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder={t.requestModel.emailPlaceholder} className={errors.email ? 'border-destructive' : ''} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t.requestModel.phoneLabel} *</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange}
                    placeholder={t.requestModel.phonePlaceholder} className={errors.phone ? 'border-destructive' : ''} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name">{t.requestModel.productNameLabel} *</Label>
                  <Input id="product_name" name="product_name" value={form.product_name} onChange={handleChange}
                    placeholder={t.requestModel.productNamePlaceholder} className={errors.product_name ? 'border-destructive' : ''} />
                  {errors.product_name && <p className="text-xs text-destructive">{errors.product_name}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t.requestModel.descriptionLabel}</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange}
                  placeholder={t.requestModel.descriptionPlaceholder} rows={4} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_url" className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> {t.requestModel.referenceUrlLabel}
                </Label>
                <Input id="reference_url" name="reference_url" value={form.reference_url} onChange={handleChange}
                  placeholder={t.requestModel.referenceUrlPlaceholder} />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {t.requestModel.imagesLabel}
                </Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                    ${dragOver ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40 hover:bg-card'}`}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t.requestModel.imagesDragDrop}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t.requestModel.imagesFormat}</p>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                    className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
                </div>

                {previews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                    {previews.map((src, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden aspect-square">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground font-semibold h-12 text-base">
                {submitting ? (
                  <>{t.requestModel.submitting}</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> {t.requestModel.submit}</>
                )}
              </Button>
            </motion.form>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
