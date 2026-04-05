import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBulkImport } from '@/contexts/BulkImportContext';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export default function BulkImportBanner() {
  const { isRunning, isComplete, items, dismiss } = useBulkImport();
  const [minimized, setMinimized] = useState(false);
  const [showReport, setShowReport] = useState(false);

  if (!isRunning && !isComplete) return null;

  const done = items.filter(i => i.status === 'done').length;
  const errored = items.filter(i => i.status === 'error').length;
  const total = items.length;
  const progress = total > 0 ? ((done + errored) / total) * 100 : 0;
  const currentItem = items.find(i => i.status === 'scraping' || i.status === 'generating' || i.status === 'saving');

  const statusLabel = (status: string) => {
    switch (status) {
      case 'queued': return 'En cola';
      case 'scraping': return '🔄 Scraping';
      case 'generating': return '🖼️ Imagen';
      case 'saving': return '💾 Guardando';
      case 'done': return '✅ Creado';
      case 'error': return '❌ Error';
      default: return status;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]"
      >
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isComplete
                ? errored > 0 ? 'bg-orange-500/20' : 'bg-green-500/20'
                : 'bg-primary/20 animate-pulse'
            }`}>
              {isRunning ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : errored > 0 ? (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {isRunning ? `Importando ${done + errored + 1}/${total}...` : 'Importación completada'}
              </p>
              {isRunning && currentItem?.name && (
                <p className="text-xs text-muted-foreground truncate">{currentItem.name}</p>
              )}
              {isComplete && (
                <p className="text-xs text-muted-foreground">
                  {done} creados · {errored} errores
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isComplete && (
                <button onClick={() => setMinimized(v => !v)} className="p-1 rounded-md hover:bg-secondary transition-colors">
                  {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              {isComplete && (
                <button onClick={dismiss} className="p-1 rounded-md hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar — always visible */}
          <div className="px-4 py-2">
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{Math.round(progress)}%</p>
          </div>

          {/* Expandable content */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* Item list (during processing show active items, after show report button) */}
                {isRunning && (
                  <div className="px-4 pb-3 space-y-1.5 max-h-[200px] overflow-y-auto">
                    {items.map((item, i) => (
                      <div key={i} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition-all ${
                        item.status === 'done' ? 'bg-green-500/5' :
                        item.status === 'error' ? 'bg-destructive/5' :
                        item.status === 'queued' ? 'opacity-40' :
                        'bg-primary/5'
                      }`}>
                        <div className="flex-shrink-0">
                          {item.status === 'queued' && <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />}
                          {(item.status === 'scraping' || item.status === 'generating' || item.status === 'saving') && (
                            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                          )}
                          {item.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                          {item.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                        </div>
                        <span className="flex-1 truncate font-mono">{item.name || new URL(item.url).pathname.split('/').pop() || item.url}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{statusLabel(item.status)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Report after completion */}
                {isComplete && !showReport && (
                  <div className="px-4 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReport(true)}
                      className="w-full gap-2 text-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Informe Detallado
                    </Button>
                  </div>
                )}

                {isComplete && showReport && (
                  <div className="px-4 pb-3 space-y-1.5 max-h-[300px] overflow-y-auto">
                    {items.map((item, i) => (
                      <div key={i} className={`flex items-start gap-2 py-2 px-2.5 rounded-lg text-xs border ${
                        item.status === 'done'
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-destructive/20 bg-destructive/5'
                      }`}>
                        {item.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name || item.url}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{item.url}</p>
                          {item.error && (
                            <p className="text-destructive mt-0.5">{item.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setShowReport(false)} className="w-full text-xs mt-1">
                      Ocultar informe
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
