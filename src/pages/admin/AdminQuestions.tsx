import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircleQuestion, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, AdminSurface } from './_shared';
import type { Database } from '@/integrations/supabase/types';

type Question = Database['public']['Tables']['product_questions']['Row'];

export default function AdminQuestions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['admin-product-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_questions')
        .select('id, product_id, question, answer, is_public, created_at, answered_at, answered_by, user_id, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Question[];
    },
  });

  const answer = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const text = value.trim();
      if (text.length < 3 || text.length > 4000) throw new Error('La respuesta debe tener entre 3 y 4000 caracteres.');
      const { error } = await supabase.from('product_questions').update({ answer: text, is_public: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-questions'] });
      queryClient.invalidateQueries({ queryKey: ['product-questions'] });
      toast({ title: 'RESPUESTA PUBLICADA' });
    },
    onError: (error: unknown) => toast({ title: 'NO SE PUDO GUARDAR', description: error instanceof Error ? error.message : 'Revisa tus permisos.', variant: 'destructive' }),
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <AdminPageHeader eyebrow="catalog · questions" title="Product Q&A" meta={`${questions.length} preguntas`} />
      {isLoading ? <AdminSurface className="p-8 text-center text-muted-foreground">Cargando preguntas…</AdminSurface> : questions.length === 0 ? <AdminSurface className="p-8 text-center text-muted-foreground">No hay preguntas todavía.</AdminSurface> : (
        <div className="space-y-3">
          {questions.map((item) => {
            const draft = drafts[item.id] ?? item.answer ?? '';
            return (
              <AdminSurface key={item.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-primary"><MessageCircleQuestion className="h-4 w-4" /> Producto {item.product_id.slice(0, 8)}</div>
                    <p className="mt-2 text-base font-semibold">{item.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className={item.answer && item.is_public ? 'border-primary/30 text-primary' : 'border-amber-400/30 text-amber-300'}>{item.answer && item.is_public ? 'PUBLICADA' : 'PENDIENTE'}</Badge>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Textarea value={draft} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Escribe una respuesta útil y clara…" rows={3} className="min-h-24 bg-secondary" />
                  <Button type="button" className="min-h-11 shrink-0 gap-2" disabled={answer.isPending || draft.trim().length < 3} onClick={() => answer.mutate({ id: item.id, value: draft })}><Save className="h-4 w-4" />Publicar</Button>
                </div>
              </AdminSurface>
            );
          })}
        </div>
      )}
    </div>
  );
}
