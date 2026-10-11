import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_STOREFRONT_LAYOUT,
  getStorefrontDeviceForWidth,
  STOREFRONT_LAYOUT_SETTING_KEY,
  parseStorefrontLayoutConfig,
  serializeStorefrontLayoutConfig,
  type StorefrontLayoutConfig,
  type StorefrontDevice,
} from '@/lib/storefront-layout';

interface StorefrontLayoutContextValue {
  config: StorefrontLayoutConfig;
  device: StorefrontDevice;
  resolvedDesign: StorefrontLayoutConfig[StorefrontDevice];
  isLoading: boolean;
  refresh: () => Promise<void>;
  saveLayout: (next: StorefrontLayoutConfig) => Promise<void>;
}

const StorefrontLayoutContext = createContext<StorefrontLayoutContextValue | undefined>(undefined);

export function StorefrontLayoutProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StorefrontLayoutConfig>(DEFAULT_STOREFRONT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [device, setDevice] = useState<StorefrontDevice>(() => getStorefrontDeviceForWidth(typeof window === 'undefined' ? 1024 : window.innerWidth));

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

  useEffect(() => {
    const updateDevice = () => setDevice(getStorefrontDeviceForWidth(window.innerWidth));
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  const saveLayout = useCallback(async (next: StorefrontLayoutConfig) => {
    const normalized = parseStorefrontLayoutConfig(next);
    const { error } = await supabase.from('admin_settings').upsert({
      setting_key: STOREFRONT_LAYOUT_SETTING_KEY,
      setting_value: serializeStorefrontLayoutConfig(normalized),
    }, { onConflict: 'setting_key' });
    if (error) throw error;
    setConfig(normalized);
  }, []);

  const value = useMemo(() => ({ config, device, resolvedDesign: config[device], isLoading, refresh, saveLayout }), [config, device, isLoading, refresh, saveLayout]);
  return <StorefrontLayoutContext.Provider value={value}>{children}</StorefrontLayoutContext.Provider>;
}

const FALLBACK: StorefrontLayoutContextValue = {
  config: DEFAULT_STOREFRONT_LAYOUT,
  device: 'desktop',
  resolvedDesign: DEFAULT_STOREFRONT_LAYOUT.desktop,
  isLoading: false,
  refresh: async () => undefined,
  saveLayout: async () => undefined,
};

export function useStorefrontLayout() {
  return useContext(StorefrontLayoutContext) ?? FALLBACK;
}
