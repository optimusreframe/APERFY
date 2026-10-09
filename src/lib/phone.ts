import { getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import { getCountryOptions, type CheckoutCountry } from './location-data';

export function getPhoneCountryOptions(language = 'en'): CheckoutCountry[] {
  return getCountryOptions(language);
}

export function normalizePhoneForCountry(value: string, countryCode: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = parsePhoneNumberFromString(trimmed, countryCode as never);
  if (parsed) return parsed.number;
  const callingCode = getCountryCallingCode(countryCode as never);
  const digits = trimmed.replace(/\D/g, '').replace(new RegExp(`^${callingCode}`), '');
  return digits ? `+${callingCode}${digits}` : '';
}

export function isCheckoutPhoneValid(value: string, countryCode: string): boolean {
  if (!value.trim()) return false;
  return isValidPhoneNumber(value, countryCode as never);
}

export async function detectCountryFromIp(
  fetcher: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher('https://ipapi.co/json/', { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json() as { country_code?: string };
    const code = payload.country_code?.toUpperCase();
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
