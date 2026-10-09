export interface CheckoutCountry {
  isoCode: string;
  name: string;
  phoneCode: string;
}

export interface CheckoutRegion {
  isoCode: string;
  name: string;
}

export interface CheckoutCity {
  name: string;
  stateCode: string;
  countryCode: string;
}

const SUPPORTED_COUNTRIES = [
  { isoCode: 'US', names: { en: 'United States', es: 'Estados Unidos' }, phoneCode: '+1' },
  { isoCode: 'VE', names: { en: 'Venezuela', es: 'Venezuela' }, phoneCode: '+58' },
] as const;

const statesCache = new Map<string, Promise<CheckoutRegion[]>>();
const citiesCache = new Map<string, Promise<CheckoutCity[]>>();

const displayNames = (language: string) => {
  try {
    return new Intl.DisplayNames([language, 'en'], { type: 'region' });
  } catch {
    return null;
  }
};

export function getCountryOptions(language = 'en'): CheckoutCountry[] {
  const names = displayNames(language);
  return SUPPORTED_COUNTRIES.map((country) => ({
    isoCode: country.isoCode,
    name: country.names[language as 'en' | 'es'] || names?.of(country.isoCode) || country.names.en,
    phoneCode: country.phoneCode,
  }));
}

export async function getStatesForCountry(countryCode: string): Promise<CheckoutRegion[]> {
  const normalizedCountry = countryCode.toUpperCase();
  if (!SUPPORTED_COUNTRIES.some((country) => country.isoCode === normalizedCountry)) return [];
  const cached = statesCache.get(normalizedCountry);
  if (cached) return cached;

  const request = fetch(`/data/location-states/${normalizedCountry}.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Unable to load states for ${normalizedCountry}`);
      return await response.json() as CheckoutRegion[];
    })
    .catch(() => {
      statesCache.delete(normalizedCountry);
      return [];
    });
  statesCache.set(normalizedCountry, request);
  return request;
}

export async function getCitiesForState(countryCode: string, stateCode: string): Promise<CheckoutCity[]> {
  const normalizedCountry = countryCode.toUpperCase();
  const normalizedState = stateCode.toUpperCase();
  if (!SUPPORTED_COUNTRIES.some((country) => country.isoCode === normalizedCountry) || !normalizedState) return [];
  const cacheKey = `${normalizedCountry}:${normalizedState}`;
  const cached = citiesCache.get(cacheKey);
  if (cached) return cached;

  const request = fetch(`/data/location-cities/${normalizedCountry}/${encodeURIComponent(normalizedState)}.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Unable to load cities for ${cacheKey}`);
      const names = await response.json() as string[];
      return names.map((name) => ({ name, stateCode: normalizedState, countryCode: normalizedCountry }));
    })
    .catch(() => {
      citiesCache.delete(cacheKey);
      return [];
    });
  citiesCache.set(cacheKey, request);
  return request;
}

export function getCountryName(countryCode: string, language = 'en'): string {
  const country = getCountryOptions(language).find((item) => item.isoCode === countryCode);
  return country?.name || countryCode;
}
