import { describe, expect, it } from 'vitest';
import { detectMacPlatform } from './platform.ts';

describe('platform detection logic', () => {
  describe('detectMacPlatform', () => {
    it('should return true for "macOS" (userAgentData)', () => {
      expect(detectMacPlatform('macOS')).toBe(true);
    });

    it('should return true for macOS userAgent string', () => {
      expect(detectMacPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(true);
    });

    it('should return false for "Windows"', () => {
      expect(detectMacPlatform('Windows')).toBe(false);
    });

    it('should return false for Windows userAgent string', () => {
      expect(detectMacPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });

    it('should return false for Linux userAgent string', () => {
      expect(detectMacPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(detectMacPlatform('MACOS')).toBe(true);
    });
  });
});

// ── Smoke test: exported constants are internally consistent ───────────────────

describe('platform module exports', () => {
  it('should export modKey consistent with isMac', async () => {
    const { isMac, modKey } = await import('./platform.ts');
    expect(modKey).toBe(isMac ? '⌘+' : 'Ctrl+');
  });

  it('should export modKeyLabel consistent with isMac', async () => {
    const { isMac, modKeyLabel } = await import('./platform.ts');
    expect(modKeyLabel).toBe(isMac ? 'Cmd' : 'Ctrl');
  });
});
