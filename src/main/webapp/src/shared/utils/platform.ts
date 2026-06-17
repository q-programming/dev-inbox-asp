/**
 * Returns true when the user is on macOS.
 * Uses the modern `navigator.userAgentData` API where available (Chromium),
 * falling back to `navigator.userAgent` string parsing for Safari/Firefox.
 *
 * Called once at module level so the result is a stable constant — no need
 * to put it in state or a hook.
 */

/** Pure detection — exported for testing without navigator mocking. */
export function detectMacPlatform(platformStr: string): boolean {
  return /mac/i.test(platformStr);
}

export const isMac: boolean = (() => {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ??
    navigator.userAgent;
  return detectMacPlatform(platform);
})();

/**
 * The modifier key symbol appropriate for the current platform.
 * Mac  → ⌘+  (Command)
 * Other → Ctrl+
 */
export const modKey = isMac ? '⌘+' : 'Ctrl+';

/**
 * Human-readable modifier key name for use in tooltips / aria-labels.
 * Mac  → "Cmd"
 * Other → "Ctrl"
 */
export const modKeyLabel = isMac ? 'Cmd' : 'Ctrl';
