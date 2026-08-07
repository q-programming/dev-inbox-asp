/**
 * Performs a hard browser navigation to the given URL.
 * Extracted into its own module so it can be mocked in tests
 * (window.location is non-configurable in real browsers).
 */
export function redirectTo(url: string): void {
  window.location.href = url;
}

// ─── Post-login return path ──────────────────────────────────────────────────

/**
 * localStorage key used to remember where the user was trying to go
 * when their session expired mid-navigation, so we can send them back
 * there after a successful re-login.
 */
export const RETURN_PATH_KEY = 'devInbox.returnPath';

/**
 * Persists the current location (path + search + hash) so it can be restored
 * after the user logs back in. Call this right before redirecting to /login.
 */
export function saveReturnPath(path: string = window.location.pathname + window.location.search + window.location.hash): void {
  // Never remember auth pages themselves as a "return path".
  if (path.startsWith('/login') || path.startsWith('/register') || path === '/') {
    return;
  }
  localStorage.setItem(RETURN_PATH_KEY, path);
}

/**
 * Reads and clears the saved return path (if any). Use after a successful login
 * to decide where to navigate the user next.
 */
export function consumeReturnPath(): string | null {
  const path = localStorage.getItem(RETURN_PATH_KEY);
  localStorage.removeItem(RETURN_PATH_KEY);
  return path;
}
