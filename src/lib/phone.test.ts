import { describe, expect, it, vi } from 'vitest';
import { detectCountryFromIp, getPhoneCountryOptions, normalizePhoneForCountry } from './phone';

describe('checkout phone helpers', () => {
  it('normalizes a local number into E.164 using the selected country', () => {
    expect(normalizePhoneForCountry('555 555 0123', 'US')).toBe('+15555550123');
    expect(normalizePhoneForCountry('6893324656', 'US')).toBe('+16893324656');
  });

  it('detects the country best-effort and fails soft', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ country_code: 'CA' }), { status: 200 }));
    await expect(detectCountryFromIp(fetcher)).resolves.toBe('CA');
    await expect(detectCountryFromIp(vi.fn().mockRejectedValue(new Error('offline')))).resolves.toBeNull();
  });

  it('exposes country options for a selector', () => {
    expect(getPhoneCountryOptions('en').some((country) => country.isoCode === 'ES')).toBe(true);
  });
});
