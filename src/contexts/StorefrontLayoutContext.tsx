import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_STOREFRONT_LAYOUT,
  STOREFRONT_LAYOUT_SETTING_KEY,
  parseStorefrontLayoutConfig,
  serializeStorefrontLayoutConfig,
  type StorefrontLayoutConfig,
} from '@/lib/storefront-layout';

interface StorefrontLayoutContextValue {
  config: StorefrontLayoutConfig;
  isLoading: boolean;
  refresh: () => Promise<void>;
  saveLayout: (next: StorefrontLayoutConfig) => Promise<void>;
}

const StorefrontLayoutContext = createContext<StorefrontLayoutContextValue | undefined>(undefined);

export function StorefrontLayoutProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StorefrontLayoutConfig>(DEFAULT_STOREFRONT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', STOREFRONT_LAYOUT_SETTING_KEY)
      .maybeSingle();
    if (!error) setConfig(parseStorefrontLayoutConfig(data?.setting_value));
    setIsLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveLayout = useCallback(async (next: StorefrontLayoutConfig) => {
    const normalized = parseStorefrontLayoutConfig(next);
    const { error } = await supabase.from('admin_settings').upsert({
      setting_key: STOREFRONT_LAYOUT_SETTING_KEY,
      setting_value: serializeStorefrontLayoutConfig(normalized),
    }, { onConflict: 'setting_key' });
    if (error) throw error;
    setConfig(normalized);
  }, []);

  const value = useMemo(() => ({ config, isLoading, refresh, saveLayout }), [config, isLoading, refresh, saveLayout]);
  return <StorefrontLayoutContext.Provider value={value}>{children}</StorefrontLayoutContext.Provider>;
}

const FALLBACK: StorefrontLayoutContextValue = {
  config: DEFAULT_STOREFRONT_LAYOUT,
  isLoading: false,
  refresh: async () => undefined,
  saveLayout: async () => undefined,
};

export function useStorefrontLayout() {
  return useContext(StorefrontLayoutContext) ?? FALLBACK;
}
