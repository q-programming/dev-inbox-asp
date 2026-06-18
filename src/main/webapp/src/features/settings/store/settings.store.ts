import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_FONT_SIZE, Density, Theme } from '@shared/theme/theme';

export const SETTINGS_STORAGE_KEY = 'devInbox.settings';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT;
}

export interface SettingsState {
  theme: Theme;
  density: Density;
  fontSize: number;
  sideBarCollapsed: boolean;
  toggleTheme: () => void;
  switchDensity: (density: Density) => void;
  changeFontSize: (fontSize: number) => void;
  toggleSideBar: () => void;
  /**
   * Merges profile preferences received from the server (e.g. from /me response).
   * Only overrides fields that are explicitly provided — undefined values are ignored
   * so existing localStorage values are preserved when the server doesn't send them yet.
   */
  applyServerProfile: (
    partial: Partial<Pick<SettingsState, 'theme' | 'density' | 'fontSize'>>,
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
      density: Density.RELAXED,
      fontSize: DEFAULT_FONT_SIZE,
      sideBarCollapsed: false,

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT,
        })),

      switchDensity: (density: Density) => set({ density }),

      changeFontSize: (fontSize: number) => set({ fontSize }),

      toggleSideBar: () => set((state) => ({ sideBarCollapsed: !state.sideBarCollapsed })),

      applyServerProfile: (partial) =>
        set((state) => ({
          theme: partial.theme ?? state.theme,
          density: partial.density ?? state.density,
          fontSize: partial.fontSize ?? state.fontSize,
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
      }),
    },
  ),
);

export default useSettingsStore;
