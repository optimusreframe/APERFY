import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type LogCategory = 'success' | 'error' | 'order' | 'import' | 'edit' | 'info';

interface LogParams {
  action: string;
  category: LogCategory;
  entity_type?: string;
  entity_id?: string;
  title: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert({
      user_id: user?.id,
      action: params.action,
      category: params.category,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      title: params.title,
      details: params.details || null,
      metadata: (params.metadata || {}) as Json,
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}
