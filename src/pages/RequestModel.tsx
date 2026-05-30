import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Link as LinkIcon, Send, Image as ImageIcon, ArrowRight, User, Mail, Phone, Package, FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Textarea } from '@/components/ui/textarea';
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

// ─── Apple-style floating-label field ───
function Field({
  id, name, label, value, onChange, error, type = 'text', icon: Icon, placeholder,
}: any) {
  const [focused, setFocused] = useState(false);
  const filled = value && value.length > 0;
  const lifted = focused || filled;
  return (
    <div className="relative">
      <div className={`relative flex items-center gap-3 pt-5 pb-2 border-b transition-colors ${
        error ? 'border-destructive' : focused ? 'border-primary' : 'border-white/[0.08]'
      }`}>
        {Icon && (
          <Icon className={`w-4 h-4 transition-colors ${focused ? 'text-primary' : 'text-muted-foreground/60'}`} />
        )}
        <label
          htmlFor={id}
          className={`absolute left-0 pointer-events-none font-mono uppercase tracking-[0.18em] transition-all duration-200 ${
            Icon ? 'pl-7' : ''
          } ${
            lifted
              ? 'top-0 text-[9px] text-primary/80'
              : 'top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground'
          }`}
        >
          {label}
        </label>
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={lifted ? placeholder : ''}
          className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground/30"
        />
        {/* animated underline */}
        <span className={`absolute bottom-[-1px] left-0 h-[1px] bg-gradient-to-r from-primary via-primary/60 to-transparent transition-all duration-300 ${
          focused ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`} />
      </div>
      {error && <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-destructive">{error}</p>}
    </div>
  );
}

export default function RequestModel() {
  const { t, language } = useLanguage();
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

      const { data: inserted, error } = await supabase.from('model_requests').insert(sanitized).select('id').single();
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'model-request-received',
            recipientEmail: sanitized.email,
            idempotencyKey: `model-request-${inserted.id}`,
            templateData: { customerName: sanitized.name, productName: sanitized.product_name },
          },
        });
      } catch (e) { console.error('Email send failed:', e); }

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

  // step progress for the Palantir-style stepper (cosmetic)
  const step1Done = !!form.name && !!form.email && !!form.phone;
  const step2Done = !!form.product_name;
  const step3Done = previews.length > 0 || !!form.reference_url || !!form.description;
  const steps = [
    { n: '01', label: language === 'es' ? 'Contacto' : 'Contact', done: step1Done },
    { n: '02', label: language === 'es' ? 'Modelo' : 'Model', done: step2Done },
    { n: '03', label: language === 'es' ? 'Referencias' : 'References', done: step3Done },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.10), transparent 60%)' }}
      />
      <Navbar />
      <section className="pt-28 pb-32 relative">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ─── Hero header ─── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary/80 mb-5">
              REQUEST · CUSTOM · 3D
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-6xl tracking-[-0.02em] leading-[1.02] text-foreground">
              {t.requestModel.title}{' '}
              <span className="text-gradient-gold">{t.requestModel.titleHighlight}</span>
            </h1>
            <p className="text-muted-foreground text-[15px] mt-5 max-w-md mx-auto leading-relaxed">
              {t.requestModel.subtitle}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="relative text-center p-12 rounded-3xl bg-card/40 backdrop-blur-2xl border border-primary/15"
              >
                <svg className="w-20 h-20 mx-auto mb-6" viewBox="0 0 64 64">
                  <motion.circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="1.5"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
                  />
                  <motion.path
                    d="M20 33 L29 42 L45 24" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
                  />
                </svg>
                <h2 className="font-display font-bold text-3xl mb-3 tracking-tight">{t.requestModel.successTitle}</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">{t.requestModel.successMessage}</p>
                <Button onClick={resetForm} variant="outline" className="border-primary/30 hover:bg-primary/10 rounded-full">
                  {t.requestModel.sendAnother}
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className="relative p-7 sm:p-10 rounded-3xl bg-card/40 backdrop-blur-2xl border border-primary/15"
                style={{ boxShadow: '0 30px 80px -20px hsl(var(--primary) / 0.08), 0 0 0 1px hsl(var(--primary) / 0.04)' }}
              >
                {/* ─── Palantir-style stepper ─── */}
                <div className="flex items-center justify-between mb-10">
                  {steps.map((s, i) => (
                    <div key={s.n} className="flex items-center flex-1 last:flex-none">
                      <div className="flex items-center gap-2.5">
                        <span className={`font-mono text-[10px] tracking-[0.15em] transition-colors ${
                          s.done ? 'text-primary' : 'text-muted-foreground/50'
                        }`}>{s.n}</span>
                        <span className={`text-[11px] uppercase tracking-[0.15em] transition-colors ${
                          s.done ? 'text-foreground' : 'text-muted-foreground/50'
                        }`}>
                          {s.label}
                        </span>
                        <motion.span
                          animate={{ scale: s.done ? 1 : 0.6, opacity: s.done ? 1 : 0.3 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      </div>
                      {i < steps.length - 1 && (
                        <div className="flex-1 h-px mx-3 bg-gradient-to-r from-white/[0.08] to-white/[0.02]" />
                      )}
                    </div>
                  ))}
                </div>

                {/* ─── Section 1: Contact ─── */}
                <div className="space-y-5 mb-10">
                  <Field id="name" name="name" icon={User}
                    label={t.requestModel.nameLabel} value={form.name} onChange={handleChange}
                    error={errors.name} placeholder={t.requestModel.namePlaceholder} />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field id="email" name="email" type="email" icon={Mail}
                      label={t.requestModel.emailLabel} value={form.email} onChange={handleChange}
                      error={errors.email} placeholder={t.requestModel.emailPlaceholder} />
                    <Field id="phone" name="phone" icon={Phone}
                      label={t.requestModel.phoneLabel} value={form.phone} onChange={handleChange}
                      error={errors.phone} placeholder={t.requestModel.phonePlaceholder} />
                  </div>
                </div>

                {/* divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-10" />

                {/* ─── Section 2: Model ─── */}
                <div className="space-y-5 mb-10">
                  <Field id="product_name" name="product_name" icon={Package}
                    label={t.requestModel.productNameLabel} value={form.product_name} onChange={handleChange}
                    error={errors.product_name} placeholder={t.requestModel.productNamePlaceholder} />

                  <div className="relative pt-2">
                    <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      {t.requestModel.descriptionLabel}
                    </label>
                    <Textarea
                      name="description" value={form.description} onChange={handleChange}
                      placeholder={t.requestModel.descriptionPlaceholder}
                      rows={4}
                      className="bg-white/[0.02] border-white/[0.06] rounded-xl focus-visible:ring-primary/30 text-[14px] resize-none"
                    />
                  </div>
                </div>

                {/* divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-10" />

                {/* ─── Section 3: References ─── */}
                <div className="space-y-5 mb-10">
                  <Field id="reference_url" name="reference_url" icon={LinkIcon}
                    label={t.requestModel.referenceUrlLabel} value={form.reference_url} onChange={handleChange}
                    error={errors.reference_url} placeholder={t.requestModel.referenceUrlPlaceholder} />

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {t.requestModel.imagesLabel}
                      </label>
                      <span className="font-mono text-[10px] tabular-nums text-primary/70">
                        {String(previews.length).padStart(2, '0')} / 05
                      </span>
                    </div>

                    <motion.div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      animate={{ scale: dragOver ? 1.01 : 1 }}
                      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                        dragOver ? 'border-primary bg-primary/[0.04]' : 'border-white/[0.10] hover:border-primary/40 hover:bg-white/[0.02]'
                      }`}
                    >
                      {dragOver && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)/0.08), transparent)' }}
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        />
                      )}
                      <Upload className={`w-9 h-9 mx-auto mb-3 transition-colors ${dragOver ? 'text-primary' : 'text-muted-foreground/60'}`} />
                      <p className="text-[13px] text-foreground/80">{t.requestModel.imagesDragDrop}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-1.5">
                        {t.requestModel.imagesFormat}
                      </p>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                        className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
                    </motion.div>

                    <AnimatePresence>
                      {previews.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4"
                        >
                          {previews.map((src, i) => (
                            <motion.div
                              key={src}
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="relative group rounded-xl overflow-hidden aspect-[3/4] border border-white/[0.08]"
                            >
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/90 backdrop-blur border border-white/[0.1] text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground">
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* ─── Submit ─── */}
                <motion.div whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit" disabled={submitting}
                    className="group relative w-full h-14 rounded-full bg-gradient-gold text-primary-foreground font-bold text-[14px] tracking-tight overflow-hidden shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all"
                  >
                    {/* shimmer */}
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        {t.requestModel.submitting}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        {t.requestModel.submit}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>
      <Footer />
    </div>
  );
}
