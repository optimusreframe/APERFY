import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, ImagePlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

  const { data: reviewProfiles = {} } = useQuery({
    queryKey: ['review-profiles', productId, reviews.length],
    queryFn: async () => {
      if (reviews.length === 0) return {};
      const userIds = [...new Set(reviews.map((r: any) => r.user_id))];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      const map: Record<string, any> = {};
      data?.forEach((p: any) => { map[p.id] = p; });
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

  const existingReview = user ? reviews.find((r: any) => r.user_id === user.id) : null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
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
          {reviews.map((review: any) => {
            const profile = (reviewProfiles as Record<string, any>)[review.user_id];
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
                    <p className="font-medium text-sm">{profile?.full_name || (language === 'es' ? 'Usuario' : 'User')}</p>
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
    </div>
  );
}
