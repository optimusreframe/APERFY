import { detectCountryFromIp } from './phone';

const COUNTRY_STORAGE_KEY = 'aperfy-storefront-country';
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

let countryDetection: Promise<string | null> | null = null;

function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const country = value.trim().toUpperCase();
  return COUNTRY_CODE_PATTERN.test(country) ? country : null;
}

export function readStoredStorefrontCountry(): string | null {
  if (typeof window === 'undefined') return null;
  return normalizeCountryCode(window.localStorage.getItem(COUNTRY_STORAGE_KEY));
}

/**
 * Resolves the visitor's country once and caches only the two-letter country
 * code. The pricing function still owns the regional pricing decision; this
 * value is just a reliable hint when the edge runtime does not add a country
 * header (for example, direct Supabase function calls during local testing).
 */
export async function getStorefrontCountryCode(): Promise<string | null> {
  const stored = readStoredStorefrontCountry();
  if (stored) return stored;
  if (!countryDetection) {
    countryDetection = detectCountryFromIp().then((country) => {
      const normalized = normalizeCountryCode(country);
      if (normalized && typeof window !== 'undefined') {
        window.localStorage.setItem(COUNTRY_STORAGE_KEY, normalized);
      }
      return normalized;
    }).catch(() => null);
  }
  return countryDetection;
}
