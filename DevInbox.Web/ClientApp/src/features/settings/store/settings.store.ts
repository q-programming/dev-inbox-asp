import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_FONT_SIZE } from '@shared/theme/theme';
import { Density, Theme, UserSettingsDto } from '@api';

export const SETTINGS_STORAGE_KEY = 'devInbox.settings';

/** Sync interval bounds, in minutes, enforced by both the slider UI and the API contract. */
export const SYNC_INTERVAL_MIN_MINUTES = 5;
export const SYNC_INTERVAL_MAX_MINUTES = 60;
export const DEFAULT_SYNC_INTERVAL_MINUTES = 15;

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.Dark : Theme.Light;
}

/**
 * Clamps a sync interval to the enforced [MIN, MAX] range. Applied both when the user drags the
 * slider and when a value arrives from the server — a stale/pre-validation DB row or corrupted
 * localStorage value (e.g. `0`) must never reach the background sync scheduler unclamped, since
 * that produces a near-zero `setInterval` delay that hammers the sync endpoint continuously.
 */
function clampSyncInterval(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return DEFAULT_SYNC_INTERVAL_MINUTES;
  }
  return Math.min(Math.max(minutes, SYNC_INTERVAL_MIN_MINUTES), SYNC_INTERVAL_MAX_MINUTES);
}

export interface SettingsState {
  theme: Theme;
  density: Density;
  fontSize: number;
  sideBarCollapsed: boolean;
  syncIntervalMinutes: number;
  sendNotifications: boolean;
  toggleTheme: () => void;
  switchDensity: (density: Density) => void;
  changeFontSize: (fontSize: number) => void;
  toggleSideBar: () => void;
  changeSyncIntervalMinutes: (syncIntervalMinutes: number) => void;
  toggleSendNotifications: () => void;
  /**
   * Merges profile preferences received from the server (e.g. from /me response).
   * Only overrides fields that are explicitly provided — undefined values are ignored
   * so existing localStorage values are preserved when the server doesn't send them yet.
   */
  applyServerProfile: (
    partial: Partial<
      Pick<
        SettingsState,
        'theme' | 'density' | 'fontSize' | 'sideBarCollapsed' | 'syncIntervalMinutes' | 'sendNotifications'
      >
    >,
  ) => void;
}

/**
 * Persists user UI preferences independently of authentication.
 * Stored in localStorage so preferences survive logout/login and browser restarts.
 * Intentionally decoupled from useUserStore — no auth dependency.
 */
const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      density: Density.Relaxed,
      fontSize: DEFAULT_FONT_SIZE,
      sideBarCollapsed: false,
      syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
      sendNotifications: false,

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === Theme.Light ? Theme.Dark : Theme.Light,
        })),

      switchDensity: (density: Density) => set({ density }),

      changeFontSize: (fontSize: number) => set({ fontSize }),

      toggleSideBar: () => set((state) => ({ sideBarCollapsed: !state.sideBarCollapsed })),

      changeSyncIntervalMinutes: (syncIntervalMinutes: number) =>
        set({ syncIntervalMinutes: clampSyncInterval(syncIntervalMinutes) }),

      toggleSendNotifications: () =>
        set((state) => ({ sendNotifications: !state.sendNotifications })),

      applyServerProfile: (settingsDto: UserSettingsDto) =>
        set((state) => ({
          theme: settingsDto.theme ?? state.theme,
          density: settingsDto.density ?? state.density,
          fontSize: settingsDto.fontSize ?? state.fontSize,
          sideBarCollapsed: settingsDto.sideBarCollapsed ?? state.sideBarCollapsed,
          syncIntervalMinutes:
            settingsDto.syncIntervalMinutes !== undefined && settingsDto.syncIntervalMinutes !== null
              ? clampSyncInterval(settingsDto.syncIntervalMinutes)
              : state.syncIntervalMinutes,
          sendNotifications: settingsDto.sendNotifications ?? state.sendNotifications,
        })),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        density: state.density,
        fontSize: state.fontSize,
        sideBarCollapsed: state.sideBarCollapsed,
        syncIntervalMinutes: state.syncIntervalMinutes,
        sendNotifications: state.sendNotifications,
      }),
    },
  ),
);

export default useSettingsStore;
