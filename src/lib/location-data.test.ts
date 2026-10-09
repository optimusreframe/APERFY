import { describe, expect, it } from 'vitest';
import { getCountryOptions, getStatesForCountry } from './location-data';

describe('checkout location data', () => {
  it('provides stable country options with ISO codes and calling codes', () => {
    const countries = getCountryOptions('en');
    const unitedStates = countries.find((country) => country.isoCode === 'US');

    expect(countries.length).toBeGreaterThan(200);
    expect(unitedStates).toMatchObject({ name: 'United States', isoCode: 'US', phoneCode: '+1' });
  });

  it('returns cascading states for a selected country', async () => {
    const florida = (await getStatesForCountry('US')).find((state) => state.isoCode === 'FL');
    expect(florida?.name).toBe('Florida');

  });
});
