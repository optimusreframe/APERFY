import { supabase } from '@/integrations/supabase/client';
import { searchNominatim, type AddressSuggestion } from './geocoding';

export function buildAddressLookupBody(query: string, countryCode?: string, featureType?: 'city') {
  const q = query.trim();
  if (!q) return null;
  return {
    q,
    ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}),
    ...(featureType ? { featureType } : {}),
  };
}

export async function searchAddress(
  query: string,
  countryCode?: string,
  signal?: AbortSignal,
  featureType?: 'city',
): Promise<AddressSuggestion[]> {
  const body = buildAddressLookupBody(query, countryCode, featureType);
  if (!body || body.q.length < 3) return [];

  try {
    const { data, error } = await supabase.functions.invoke('search-address', { body });
    if (signal?.aborted) return [];
    if (!error && Array.isArray(data?.suggestions)) return data.suggestions as AddressSuggestion[];
  } catch {
    // Keep manual entry usable if the edge function is temporarily unavailable.
  }

  if (signal?.aborted) return [];
  return searchNominatim(query, countryCode, signal, featureType);
}
