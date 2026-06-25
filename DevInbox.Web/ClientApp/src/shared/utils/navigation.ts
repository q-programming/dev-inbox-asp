/**
 * Performs a hard browser navigation to the given URL.
 * Extracted into its own module so it can be mocked in tests
 * (window.location is non-configurable in real browsers).
 */
export function redirectTo(url: string): void {
  window.location.href = url;
}
