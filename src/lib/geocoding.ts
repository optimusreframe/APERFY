export interface NominatimResult {
  display_name?: string;
  address?: Record<string, string | undefined>;
}

export interface AddressSuggestion {
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  countryCode: string;
}

export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export function buildNominatimSearchUrl(query: string, countryCode?: string, featureType?: 'city'): string {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('q', query.trim());
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  url.searchParams.set('email', 'aperfy@kpwr.dev');
  url.searchParams.set('accept-language', 'es,en');
  if (countryCode) url.searchParams.set('countrycodes', countryCode.toLowerCase());
  if (featureType) url.searchParams.set('featuretype', featureType);
  return url.toString();
}

export function mapNominatimResult(result: NominatimResult): AddressSuggestion {
  const address = result.address || {};
  const street = [address.house_number, address.road].filter(Boolean).join(' ').trim();
  return {
    label: result.display_name || [street, address.city, address.state, address.postcode].filter(Boolean).join(', '),
    address: street || address.road || '',
    city: address.city || address.town || address.village || address.municipality || '',
    state: address.state || address.region || '',
    zipCode: address.postcode || '',
    country: address.country || '',
    countryCode: (address.country_code || '').toUpperCase(),
  };
}

export async function searchNominatim(
  query: string,
  countryCode?: string,
  signal?: AbortSignal,
  featureType?: 'city',
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  const response = await fetch(buildNominatimSearchUrl(query, countryCode, featureType), {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Address lookup failed (${response.status})`);
  const results = await response.json() as NominatimResult[];
  return results.map(mapNominatimResult);
}
