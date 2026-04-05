import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryPillsProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
  const { language, t } = useLanguage();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-pills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      <button
        onClick={() => onSelect(null)}
        className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
          selected === null
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary'
        }`}
      >
        {selected === null && (
          <motion.div
            layoutId="categoryPill"
            className="absolute inset-0 rounded-full bg-gradient-gold shadow-gold"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10">{t.store.allCategories}</span>
      </button>
      {categories.map((cat: any) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
            selected === cat.id
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary'
          }`}
        >
          {selected === cat.id && (
            <motion.div
              layoutId="categoryPill"
              className="absolute inset-0 rounded-full bg-gradient-gold shadow-gold"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            {language === 'es' ? cat.name_es : cat.name_en}
          </span>
        </button>
      ))}
    </div>
  );
}
