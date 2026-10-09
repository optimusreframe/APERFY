import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCitiesForState, getCountryOptions, getStatesForCountry } from './location-data';

describe('checkout location data', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('provides stable country options with ISO codes and calling codes', () => {
    const countries = getCountryOptions('en');
    const unitedStates = countries.find((country) => country.isoCode === 'US');
    const venezuela = countries.find((country) => country.isoCode === 'VE');

    expect(countries.map((country) => country.isoCode)).toEqual(['US', 'VE']);
    expect(unitedStates).toMatchObject({ name: 'United States', isoCode: 'US', phoneCode: '+1' });
    expect(venezuela).toMatchObject({ name: 'Venezuela', isoCode: 'VE', phoneCode: '+58' });
  });

  it('returns no locations for countries outside the supported checkout scope', async () => {
    expect(await getStatesForCountry('CA')).toEqual([]);
    expect(await getCitiesForState('CA', 'ON')).toEqual([]);
  });

  it('loads states for a supported country from its static resource', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/data/location-states/US.json');
      return new Response(JSON.stringify([{ isoCode: 'FL', name: 'Florida' }]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetcher);

    const states = await getStatesForCountry('US');

    expect(states).toEqual([{ isoCode: 'FL', name: 'Florida' }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('loads cities for a selected supported state from its static resource', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/data/location-cities/VE/B.json');
      return new Response(JSON.stringify(['Barcelona', 'Anaco']), { status: 200 });
    });
    vi.stubGlobal('fetch', fetcher);

    const cities = await getCitiesForState('VE', 'B');

    expect(cities).toEqual([
      { name: 'Barcelona', stateCode: 'B', countryCode: 'VE' },
      { name: 'Anaco', stateCode: 'B', countryCode: 'VE' },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
