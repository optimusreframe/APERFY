import { lazy, type ComponentType } from 'react';

const RETRY_PREFIX = 'aperfy-lazy-retry:';

function storageKey(chunkName: string) {
  return `${RETRY_PREFIX}${chunkName}`;
}

function hasRetried(chunkName: string) {
  try {
    return window.sessionStorage.getItem(storageKey(chunkName)) === '1';
  } catch {
    return false;
  }
}

function markRetried(chunkName: string) {
  try {
    window.sessionStorage.setItem(storageKey(chunkName), '1');
  } catch {
    // Storage can be unavailable in private browsing or embedded webviews.
  }
}

function clearRetryMarker(chunkName: string) {
  try {
    window.sessionStorage.removeItem(storageKey(chunkName));
  } catch {
    // Storage can be unavailable in private browsing or embedded webviews.
  }
}

export function isDynamicImportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /chunkloaderror|loading chunk|failed to fetch dynamically imported module|importing a module script failed|dynamically imported module/i.test(message);
}

/**
 * Recovers from a stale PWA/service-worker asset once. A deploy can replace a
 * lazy route chunk while an already-open app still points at the old filename.
 * Reloading once gets the new manifest; the boundary above the router handles
 * any remaining error without leaving the app on a blank screen.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  chunkName: string,
) {
  return lazy(async () => {
    try {
      const module = await importer();
      clearRetryMarker(chunkName);
      return module;
    } catch (error) {
      if (!isDynamicImportError(error) || hasRetried(chunkName)) throw error;

      markRetried(chunkName);
      window.location.reload();

      // Keep Suspense active until the reload completes. This prevents the
      // failed route from briefly rendering an empty shell.
      return await new Promise<never>(() => undefined);
    }
  });
}
