import { describe, expect, it } from 'vitest';
import { buildNominatimSearchUrl, mapNominatimResult } from './geocoding';

describe('OpenStreetMap address autocomplete', () => {
  it('builds a bounded, encoded search URL', () => {
    const url = new URL(buildNominatimSearchUrl('11609 S Orange Blossom Tr', 'US'));
    expect(url.hostname).toBe('nominatim.openstreetmap.org');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('countrycodes')).toBe('us');
    expect(url.searchParams.get('q')).toBe('11609 S Orange Blossom Tr');
    expect(url.searchParams.get('email')).toBe('aperfy@kpwr.dev');
  });

  it('can narrow city lookup to the selected country', () => {
    const url = new URL(buildNominatimSearchUrl('Orlando', 'US', 'city'));
    expect(url.searchParams.get('featuretype')).toBe('city');
  });

  it('maps a result into checkout fields without requiring every address part', () => {
    expect(mapNominatimResult({
      display_name: '11609 S Orange Blossom Tr, Orlando, Florida, United States',
      address: {
        house_number: '11609',
        road: 'S Orange Blossom Tr',
        city: 'Orlando',
        state: 'Florida',
        postcode: '32837',
        country: 'United States',
        country_code: 'us',
      },
    })).toMatchObject({
      address: '11609 S Orange Blossom Tr',
      city: 'Orlando',
      state: 'Florida',
      zipCode: '32837',
      country: 'United States',
      countryCode: 'US',
    });
  });
});
