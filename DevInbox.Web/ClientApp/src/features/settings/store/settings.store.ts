import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_FONT_SIZE } from '@shared/theme/theme';
import { Density, Theme, UserSettingsDto } from '@api';

export const SETTINGS_STORAGE_KEY = 'devInbox.settings';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.Dark : Theme.Light;
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
      density: Density.Relaxed,
      fontSize: DEFAULT_FONT_SIZE,
      sideBarCollapsed: false,

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === Theme.Light ? Theme.Dark : Theme.Light,
        })),

      switchDensity: (density: Density) => set({ density }),

      changeFontSize: (fontSize: number) => set({ fontSize }),

      toggleSideBar: () => set((state) => ({ sideBarCollapsed: !state.sideBarCollapsed })),

      applyServerProfile: (settingsDto: UserSettingsDto) =>
        set((state) => ({
          theme: settingsDto.theme ?? state.theme,
          density: settingsDto.density ?? state.density,
          fontSize: settingsDto.fontSize ?? state.fontSize,
          sideBarCollapsed: settingsDto.sideBarCollapsed ?? state.sideBarCollapsed,
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
