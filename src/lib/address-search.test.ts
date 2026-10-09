import { describe, expect, it } from 'vitest';
import { buildAddressLookupBody } from './address-search';

describe('checkout address lookup', () => {
  it('normalizes partial address searches for the protected lookup function', () => {
    expect(buildAddressLookupBody('  8775 Sartori St  ', 'US')).toEqual({
      q: '8775 Sartori St',
      countryCode: 'US',
    });
  });

  it('does not send a lookup request for an empty query', () => {
    expect(buildAddressLookupBody('  ', 'US')).toBeNull();
  });
});
