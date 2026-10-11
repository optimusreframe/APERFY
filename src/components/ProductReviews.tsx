import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, ImagePlus, X, BadgeCheck, MessageCircleQuestion } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { ProfileSummary, Review } from '@/lib/model-types';

interface ProductReviewsProps {
  productId: string;
}

function StarRating({ rating, onRate, interactive = false, size = 'md' }: { rating: number; onRate?: (r: number) => void; interactive?: boolean; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={cn(interactive && 'cursor-pointer hover:scale-110 transition-transform', !interactive && 'cursor-default')}
        >
          <Star className={cn(s, i <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30')} />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  type ProductQuestion = Database['public']['Tables']['product_questions']['Row'];

  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['product-questions', productId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_questions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductQuestion[];
    },
  });

  const { data: reviewProfiles = {} } = useQuery({
    queryKey: ['review-profiles', productId, reviews.length],
    queryFn: async () => {
      if (reviews.length === 0) return {};
      const userIds = [...new Set(reviews.map((review) => review.user_id))];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      const map: Record<string, ProfileSummary> = {};
      data?.forEach((profile) => { map[profile.id] = profile; });
      return map;
    },
    enabled: reviews.length > 0,
  });

  const { data: hasPurchased = false } = useQuery({
    queryKey: ['has-purchased', productId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc('has_purchased_product', {
        _user_id: user.id,
        _product_id: productId,
      });
      return !!data;
    },
    enabled: !!user,
  });

  const existingReview = user ? reviews.find((review) => review.user_id === user.id) : null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('review-media').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('review-media').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
    }
    setMediaFiles(prev => [...prev, ...newUrls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const payload = {
      user_id: user.id,
      product_id: productId,
      rating: newRating,
      comment: newComment || null,
      media: mediaFiles,
    };

    if (existingReview) {
      await supabase.from('product_reviews').update(payload).eq('id', existingReview.id);
    } else {
      const { error } = await supabase.from('product_reviews').insert(payload);
      if (error) {
        toast({ title: language === 'es' ? 'Error al enviar reseña' : 'Error submitting review', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
    }

    toast({ title: language === 'es' ? 'Reseña publicada' : 'Review posted' });
    setNewComment('');
    setMediaFiles([]);
    setNewRating(5);
    queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
    setSubmitting(false);
  };

  const handleQuestion = async () => {
    const value = question.trim();
    if (!user || value.length < 3 || value.length > 2000) return;
    setSubmittingQuestion(true);
    const { error } = await supabase.from('product_questions').insert({
      product_id: productId,
      user_id: user.id,
      question: value,
    });
    setSubmittingQuestion(false);
    if (error) {
      toast({ title: language === 'es' ? 'No se pudo enviar la pregunta' : 'Could not submit question', variant: 'destructive' });
      return;
    }
    setQuestion('');
    queryClient.invalidateQueries({ queryKey: ['product-questions', productId] });
    toast({ title: language === 'es' ? 'Pregunta enviada' : 'Question submitted' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="font-display font-bold text-2xl">
          {language === 'es' ? 'Reseñas' : 'Reviews'}
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm text-muted-foreground">
              {avgRating.toFixed(1)} ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {/* Write review form */}
      {user && hasPurchased && !existingReview && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display font-semibold">
            {language === 'es' ? 'Escribe tu reseña' : 'Write your review'}
          </h3>
          <StarRating rating={newRating} onRate={setNewRating} interactive />
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={language === 'es' ? 'Comparte tu experiencia...' : 'Share your experience...'}
            className="bg-secondary border-border"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            {mediaFiles.map((url, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
              <ImagePlus className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="image/*,video/*" multiple onChange={handleUploadMedia} className="hidden" />
            </label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="bg-gradient-gold text-primary-foreground font-semibold"
          >
            {submitting
              ? (language === 'es' ? 'Publicando...' : 'Posting...')
              : (language === 'es' ? 'Publicar Reseña' : 'Post Review')}
          </Button>
        </div>
      )}

      {user && !hasPurchased && !existingReview && (
        <div className="bg-card border border-border rounded-xl p-5 text-center text-muted-foreground">
          <p>{language === 'es' ? 'Compra este producto para dejar una reseña' : 'Purchase this product to leave a review'}</p>
        </div>
      )}

      {!user && (
        <div className="bg-card border border-border rounded-xl p-5 text-center text-muted-foreground">
          <p>{language === 'es' ? 'Inicia sesión para dejar una reseña' : 'Sign in to leave a review'}</p>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {language === 'es' ? 'Aún no hay reseñas' : 'No reviews yet'}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: Review) => {
            const profile = (reviewProfiles as Record<string, ProfileSummary>)[review.user_id];
            const media = (review.media as string[]) || [];
            return (
              <div key={review.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-xs bg-secondary">
                      {(profile?.full_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="flex items-center gap-1.5 font-medium text-sm">
                      {profile?.full_name || (language === 'es' ? 'Usuario' : 'User')}
                      {review.is_verified && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary"><BadgeCheck className="h-3.5 w-3.5" />{language === 'es' ? 'Compra verificada' : 'Verified purchase'}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                    </p>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.comment && <p className="text-sm text-foreground/90 leading-relaxed">{review.comment}</p>}
                {media.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {media.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-20 h-20 rounded-lg overflow-hidden">
                        {url.match(/\.(mp4|webm|mov)$/i) ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <section className="space-y-4 border-t border-white/[0.06] pt-8">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-2xl">{language === 'es' ? 'Preguntas y respuestas' : 'Questions & answers'}</h2>
        </div>
        {user ? (
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-card p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="product-question" className="mb-2 block text-sm font-medium">{language === 'es' ? '¿Qué quieres saber sobre este producto?' : 'What would you like to know about this product?'}</label>
              <Textarea id="product-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} rows={2} placeholder={language === 'es' ? 'Escribe una pregunta…' : 'Ask a question…'} className="bg-secondary border-border" />
            </div>
            <Button type="button" onClick={() => void handleQuestion()} disabled={submittingQuestion || question.trim().length < 3} className="min-h-11">{submittingQuestion ? '…' : (language === 'es' ? 'Preguntar' : 'Ask')}</Button>
          </div>
        ) : (
          <p className="rounded-xl border border-white/[0.06] bg-card p-4 text-sm text-muted-foreground">{language === 'es' ? 'Inicia sesión para hacer una pregunta.' : 'Sign in to ask a question.'}</p>
        )}
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{language === 'es' ? 'Todavía no hay preguntas.' : 'No questions yet.'}</p>
        ) : (
          <div className="space-y-3">
            {questions.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[0.06] bg-card p-4 text-sm">
                <p className="font-medium">Q: {item.question}</p>
                {item.answer ? <p className="mt-2 text-muted-foreground"><span className="font-semibold text-primary">A:</span> {item.answer}</p> : <p className="mt-2 text-xs text-muted-foreground">{language === 'es' ? 'Pendiente de respuesta del equipo APERFY.' : 'Waiting for an APERFY answer.'}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
