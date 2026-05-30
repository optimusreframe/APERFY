import { useEffect, useState, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from('admin_notifications')
      .select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { if (mounted && data) setNotifs(data as Notif[]); });

    const channel = supabase.channel('admin-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          setNotifs(prev => [payload.new as Notif, ...prev].slice(0, 30));
          // pulse audio (optional)
          try {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AC) {
              const ctx = new AC();
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
              g.gain.setValueAtTime(0.04, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
              o.start(); o.stop(ctx.currentTime + 0.25);
            }
          } catch {}
        }
      ).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const unread = notifs.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const ids = notifs.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from('admin_notifications').update({ is_read: true }).in('id', ids);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const dismiss = async (id: string) => {
    await supabase.from('admin_notifications').delete().eq('id', id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-lg border border-border/60 bg-card/40 hover:bg-card/60 flex items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-foreground/80" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-[360px] max-h-[480px] rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">inbox</div>
                <div className="text-sm font-semibold">Notifications</div>
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-mono uppercase tracking-wider text-primary hover:text-primary/80">
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-[400px]">
              {notifs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No notifications</div>
              ) : notifs.map(n => (
                <div
                  key={n.id}
                  className={`group relative px-4 py-3 border-b border-border/40 hover:bg-card/40 transition-colors ${!n.is_read ? 'bg-primary/[0.03]' : ''}`}
                >
                  {!n.is_read && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</div>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {n.link && (
                          <Link to={n.link} onClick={() => { markRead(n.id); setOpen(false); }}
                                className="font-mono text-[10px] uppercase tracking-wider text-primary hover:text-primary/80">
                            Open →
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.is_read && (
                        <button onClick={() => markRead(n.id)} className="p-1 rounded hover:bg-muted/40" title="Mark read">
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => dismiss(n.id)} className="p-1 rounded hover:bg-destructive/10">
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
