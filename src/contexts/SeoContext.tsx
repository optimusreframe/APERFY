import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getSeoCopyForPath, getSeoImageForPath, parseSeoSettings, SEO_SETTINGS_KEY, serializeSeoSettings, DEFAULT_SEO_SETTINGS, type SeoSettings } from '@/lib/seo-settings';

type SeoContextValue = {
  settings: SeoSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
  save: (settings: Partial<SeoSettings>) => Promise<void>;
};

const SeoContext = createContext<SeoContextValue | undefined>(undefined);

function setMeta(selector: string, attribute: string, key: string, value: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

export function SeoProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const location = useLocation();
  const [settings, setSettings] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', SEO_SETTINGS_KEY)
      .maybeSingle();
    if (!error) setSettings(parseSeoSettings(data?.setting_value));
    setIsLoading(false);
  }, []);

  const save = useCallback(async (next: Partial<SeoSettings>) => {
    const normalized = parseSeoSettings(serializeSeoSettings({ ...settings, ...next }));
    const { error } = await supabase.from('admin_settings').upsert({
      setting_key: SEO_SETTINGS_KEY,
      setting_value: serializeSeoSettings(normalized),
    }, { onConflict: 'setting_key' });
    if (error) throw error;
    setSettings(normalized);
  }, [settings]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const handleSettingsUpdate = () => { void refresh(); };
    window.addEventListener('aperfy-seo-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('aperfy-seo-settings-updated', handleSettingsUpdate);
  }, [refresh]);

  useEffect(() => {
    if (location.pathname.startsWith('/products/')) return;
    const copy = getSeoCopyForPath(location.pathname, language, settings);
    const image = getSeoImageForPath(location.pathname, settings);
    const canonical = new URL(location.pathname || '/', settings.canonical_url).toString();
    document.title = copy.title;
    setMeta('meta[name="description"]', 'name', 'description', copy.description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', copy.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', copy.description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', settings.site_name);
    setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', settings.site_name);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', copy.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', copy.description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    setMeta('meta[name="robots"]', 'name', 'robots', settings.robots_index ? 'index,follow' : 'noindex,nofollow');
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;
    if (settings.google_site_verification) setMeta('meta[name="google-site-verification"]', 'name', 'google-site-verification', settings.google_site_verification);
    else removeMeta('meta[name="google-site-verification"]');
    document.getElementById('product-jsonld')?.remove();
  }, [language, location.pathname, settings]);

  const value = useMemo(() => ({ settings, isLoading, refresh, save }), [isLoading, refresh, save, settings]);
  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

const FALLBACK: SeoContextValue = { settings: DEFAULT_SEO_SETTINGS, isLoading: false, refresh: async () => undefined, save: async () => undefined };

export function useSeoSettings() {
  return useContext(SeoContext) ?? FALLBACK;
}
