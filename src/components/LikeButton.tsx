import { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  productId: string;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md';
  countOnly?: boolean;
  externalCount?: number;
}

export default function LikeButton({ productId, className, showCount = true, size = 'sm', countOnly = false, externalCount = 0 }: LikeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countOnly) return;
    const fetchLikes = async () => {
      const { count: total } = await supabase
        .from('product_likes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);
      setCount(total || 0);

      if (user) {
        const { data } = await supabase
          .from('product_likes')
          .select('id')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle();
        setLiked(!!data);
      }
    };
    fetchLikes();
  }, [productId, user, countOnly]);

  if (countOnly) {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    return (
      <div className={cn('flex items-center gap-1 text-muted-foreground', className)}>
        <ThumbsUp className={iconSize} />
        <span className="text-xs">{externalCount}</span>
      </div>
    );
  }

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: language === 'es' ? 'Inicia sesión para dar like' : 'Sign in to like', variant: 'destructive' });
      return;
    }
    if (loading) return;
    setLoading(true);

    if (liked) {
      await supabase.from('product_likes').delete().eq('user_id', user.id).eq('product_id', productId);
      setLiked(false);
      setCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('product_likes').insert({ user_id: user.id, product_id: productId });
      setLiked(true);
      setCount(c => c + 1);
    }
    setLoading(false);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={toggleLike}
      className={cn(
        'flex items-center gap-1 transition-all',
        liked ? 'text-primary' : 'text-muted-foreground hover:text-primary',
        className
      )}
    >
      <ThumbsUp className={cn(iconSize, liked && 'fill-primary')} />
      {showCount && count > 0 && <span className="text-xs font-medium">{count}</span>}
    </button>
  );
}
