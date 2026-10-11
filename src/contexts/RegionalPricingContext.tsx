import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  canUseVes,
  getDefaultPricingContext,
  type PricingContext,
  type PricingCurrency,
  type StorefrontPricingPayload,
} from '@/lib/regional-pricing';

interface RegionalPricingContextValue {
  pricing: PricingContext;
  setPricing: (payload: StorefrontPricingPayload) => void;
  currency: PricingCurrency;
  setCurrency: (currency: PricingCurrency) => void;
  canUseVes: boolean;
  pricingResolved: boolean;
}

const STORAGE_KEY = 'aperfy-pricing-currency';
const RegionalPricingContext = createContext<RegionalPricingContextValue | undefined>(undefined);
const FALLBACK_CONTEXT: RegionalPricingContextValue = {
  pricing: getDefaultPricingContext(),
  setPricing: () => undefined,
  currency: 'USD',
  setCurrency: () => undefined,
  canUseVes: false,
  pricingResolved: false,
};

function readCurrency(): PricingCurrency {
  if (typeof window === 'undefined') return 'USD';
  return window.localStorage.getItem(STORAGE_KEY) === 'VES' ? 'VES' : 'USD';
}

export function RegionalPricingProvider({ children }: { children: ReactNode }) {
  const [pricing, setPricingState] = useState<PricingContext>(getDefaultPricingContext);
  const [currency, setCurrencyState] = useState<PricingCurrency>(readCurrency);
  const [pricingResolved, setPricingResolved] = useState(false);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const vesAvailable = canUseVes(pricing);

  const setPricing = useCallback((payload: StorefrontPricingPayload) => {
    setPricingState((current) => {
      const currentUpdatedAt = current.rateUpdatedAt ? Date.parse(current.rateUpdatedAt) : 0;
      const payloadUpdatedAt = payload.rateUpdatedAt ? Date.parse(payload.rateUpdatedAt) : 0;
      if (currentUpdatedAt && payloadUpdatedAt && payloadUpdatedAt < currentUpdatedAt) {
        return {
          ...current,
          region: payload.region,
          mode: payload.mode,
          currency: 'USD',
        };
      }
      return { ...current, ...payload, currency: 'USD' };
    });
    setPricingResolved(true);
  }, []);

  const refreshPricing = useCallback(() => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = supabase.functions.invoke('storefront-pricing', { body: { action: 'pricing', refresh: true } })
      .then(({ data, error }) => {
        if (!error && data?.pricing) setPricing(data.pricing as StorefrontPricingPayload);
      })
      .catch(() => undefined)
      .finally(() => {
        refreshInFlight.current = null;
      });

    refreshInFlight.current = request;
    return request;
  }, [setPricing]);

  const setCurrency = useCallback((next: PricingCurrency) => {
    setCurrencyState(next === 'VES' && vesAvailable ? 'VES' : 'USD');
    void refreshPricing();
  }, [refreshPricing, vesAvailable]);

  useEffect(() => {
    if (!vesAvailable && currency !== 'USD') setCurrencyState('USD');
  }, [vesAvailable, currency]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    void refreshPricing();

    const handlePageShow = () => { void refreshPricing(); };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshPricing();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshPricing]);

  const value = useMemo(() => ({
    pricing: { ...pricing, currency },
    setPricing,
    currency,
    setCurrency,
    canUseVes: vesAvailable,
    pricingResolved,
  }), [pricing, currency, setPricing, setCurrency, vesAvailable, pricingResolved]);

  return <RegionalPricingContext.Provider value={value}>{children}</RegionalPricingContext.Provider>;
}

export function useRegionalPricing() {
  const context = useContext(RegionalPricingContext);
  return context ?? FALLBACK_CONTEXT;
}
