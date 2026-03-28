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

const PUBLIC_URL = 'https://a3dtoprint.lovable.app';

interface ShareMenuProps {
  slug: string;
  productName: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function ShareMenu({ slug, productName, className, size = 'sm' }: ShareMenuProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = `${PUBLIC_URL}/3dmodels/${slug}`;
  const text = language === 'es' ? `Mira este modelo 3D: ${productName}` : `Check out this 3D model: ${productName}`;

  const shareOptions = [
    { label: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { label: 'Telegram', icon: '✈️', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { label: 'Facebook', icon: '📘', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'X (Twitter)', icon: '🐦', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { label: 'Reddit', icon: '🔴', href: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}` },
    { label: 'TikTok', icon: '🎵', href: `https://www.tiktok.com/share?url=${encodeURIComponent(url)}` },
    { label: 'Instagram', icon: '📷', href: `https://www.instagram.com/` },
  ];

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: language === 'es' ? 'Enlace copiado' : 'Link copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={cn('text-muted-foreground hover:text-primary transition-colors', className)}
        >
          <Share2 className={iconSize} />
        </button>
      </DropdownMenuTrigger>
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
