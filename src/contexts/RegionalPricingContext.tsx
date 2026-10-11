import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  const vesAvailable = canUseVes(pricing);

  const setPricing = useCallback((payload: StorefrontPricingPayload) => {
    setPricingState((current) => ({ ...current, ...payload, currency: 'USD' }));
    setPricingResolved(true);
  }, []);

  const setCurrency = useCallback((next: PricingCurrency) => {
    setCurrencyState(next === 'VES' && vesAvailable ? 'VES' : 'USD');
  }, [vesAvailable]);

  useEffect(() => {
    if (!vesAvailable && currency !== 'USD') setCurrencyState('USD');
  }, [vesAvailable, currency]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    let cancelled = false;
    void supabase.functions.invoke('storefront-pricing', { body: { action: 'pricing' } }).then(({ data, error }) => {
      if (!cancelled && !error && data?.pricing) setPricing(data.pricing as StorefrontPricingPayload);
    });
    return () => { cancelled = true; };
  }, [setPricing]);

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
