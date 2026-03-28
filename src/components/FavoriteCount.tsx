import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteCountProps {
  count: number;
  className?: string;
}

export default function FavoriteCount({ count, className }: FavoriteCountProps) {
  return (
    <div className={cn('flex items-center gap-1 text-muted-foreground', className)}>
      <Heart className="w-3.5 h-3.5" />
      <span className="text-xs">{count}</span>
    </div>
  );
}
