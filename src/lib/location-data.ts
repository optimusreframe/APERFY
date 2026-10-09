import Country from 'country-state-city/lib/country';

export interface CheckoutCountry {
  isoCode: string;
  name: string;
  phoneCode: string;
}

export interface CheckoutRegion {
  isoCode: string;
  name: string;
}

const displayNames = (language: string) => {
  try {
    return new Intl.DisplayNames([language, 'en'], { type: 'region' });
  } catch {
    return null;
  }
};

export function getCountryOptions(language = 'en'): CheckoutCountry[] {
  const names = displayNames(language);
  return Country.getAllCountries()
    .map((country) => ({
      isoCode: country.isoCode,
      name: names?.of(country.isoCode) || country.name,
      phoneCode: country.phonecode ? `+${country.phonecode}` : '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, language));
}

export async function getStatesForCountry(countryCode: string): Promise<CheckoutRegion[]> {
  if (!countryCode) return [];
  // State data is loaded only after a country is selected, keeping the
  // storefront/checkout entry chunk small on mobile connections.
  const { default: State } = await import('country-state-city/lib/state');
  return State.getStatesOfCountry(countryCode).map((state) => ({
    isoCode: state.isoCode,
    name: state.name,
  }));
}

export function getCountryName(countryCode: string, language = 'en'): string {
  const country = getCountryOptions(language).find((item) => item.isoCode === countryCode);
  return country?.name || countryCode;
}
