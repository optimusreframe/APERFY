import { Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const PUBLIC_URL = 'https://aperfy.online';

interface ShareMenuProps {
  slug: string;
  productName: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Share button. Uses native navigator.share when available (mobile/PWA),
 * falls back to a dropdown with platform-specific links.
 */
export default function ShareMenu({ slug, productName, className, size = 'sm' }: ShareMenuProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = `${PUBLIC_URL}/products/${slug}`;
  const text = language === 'es' ? `Mira este producto: ${productName}` : `Check out this product: ${productName}`;

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const hasNativeShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasNativeShare) {
      try {
        await (navigator as any).share({ title: productName, text, url });
        return;
      } catch (err: any) {
        // user cancelled or browser blocked – fall through to dropdown
        if (err?.name === 'AbortError') return;
      }
    }
    setOpen(true);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: language === 'es' ? 'Enlace copiado' : 'Link copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { label: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { label: 'Telegram', icon: '✈️', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { label: 'Facebook', icon: '📘', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'X (Twitter)', icon: '🐦', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { label: 'Reddit', icon: '🔴', href: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}` },
  ];

  const triggerBtn = (
    <button
      onClick={handleClick}
      aria-label={language === 'es' ? 'Compartir' : 'Share'}
      className={cn('text-muted-foreground hover:text-primary transition-colors', className)}
    >
      <Share2 className={iconSize} />
    </button>
  );

  if (hasNativeShare) return triggerBtn;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerBtn}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {shareOptions.map((opt) => (
          <DropdownMenuItem key={opt.label} asChild>
            <a href={opt.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={copyLink} className="flex items-center gap-2 cursor-pointer">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{language === 'es' ? 'Copiar enlace' : 'Copy link'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
