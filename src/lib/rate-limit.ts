interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Client-side rate limiter for sensitive actions.
 * @param key Unique identifier for the action (e.g., 'login', 'checkout')
 * @param maxAttempts Maximum attempts allowed within the window
 * @param windowMs Time window in milliseconds
 * @returns { allowed: boolean, retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000 // 5 minutes
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  // No previous attempts or window expired
  if (!entry || now - entry.firstAttempt > windowMs) {
    store.set(key, { attempts: 1, firstAttempt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Within window
  if (entry.attempts >= maxAttempts) {
    const retryAfterMs = windowMs - (now - entry.firstAttempt);
    return { allowed: false, retryAfterMs };
  }

  entry.attempts++;
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Reset the rate limit for a specific key (e.g., after successful login)
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Format remaining time as human-readable string
 */
export function formatRetryTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
