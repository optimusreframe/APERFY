import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, ShoppingCart, Download, Pencil, Info } from 'lucide-react';

const TABS = [
  { value: 'all', label: 'Todos', icon: ScrollText },
  { value: 'success', label: 'Éxitos', icon: CheckCircle2 },
  { value: 'error', label: 'Errores', icon: AlertCircle },
  { value: 'order', label: 'Órdenes', icon: ShoppingCart },
  { value: 'import', label: 'Importaciones', icon: Download },
  { value: 'edit', label: 'Ediciones', icon: Pencil },
  { value: 'info', label: 'Info', icon: Info },
] as const;

const categoryColors: Record<string, string> = {
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  order: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  import: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  edit: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  info: 'bg-muted text-muted-foreground border-border',
};

const PAGE_SIZE = 50;

export default function AdminLogs() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', tab, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (tab !== 'all') {
        query = query.eq('category', tab);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data || [], count: count || 0 };
    },
  });

  const logs = data?.logs || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="w-6 h-6 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Activity Logs</h1>
        <Badge variant="outline" className="ml-2">{totalCount} registros</Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(0); }}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(t => (
          <TabsContent key={t.value} value={t.value}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay registros en esta categoría.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Fecha</TableHead>
                      <TableHead className="w-[100px]">Categoría</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <LogRow
                        key={log.id}
                        log={log}
                        expanded={expandedId === log.id}
                        onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LogRow({ log, expanded, onToggle }: { log: any; expanded: boolean; onToggle: () => void }) {
  const hasDetails = log.details || (log.metadata && Object.keys(log.metadata).length > 0);

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-secondary/30 ${expanded ? 'bg-secondary/20' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <TableCell className="text-xs text-muted-foreground font-mono">
          {new Date(log.created_at).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={categoryColors[log.category] || categoryColors.info}>
            {log.category}
          </Badge>
        </TableCell>
        <TableCell className="text-xs font-mono text-muted-foreground">{log.action}</TableCell>
        <TableCell className="font-medium text-sm">{log.title}</TableCell>
        <TableCell>
          {hasDetails && (
            expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </TableCell>
      </TableRow>
      {expanded && hasDetails && (
        <TableRow>
          <TableCell colSpan={5} className="bg-secondary/10 px-6 py-4">
            {log.details && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Detalles:</p>
                <p className="text-sm whitespace-pre-wrap">{log.details}</p>
              </div>
            )}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Metadata:</p>
                <pre className="text-xs bg-secondary/50 rounded p-2 overflow-auto max-h-40">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
