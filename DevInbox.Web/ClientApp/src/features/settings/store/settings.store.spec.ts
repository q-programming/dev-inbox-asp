import { beforeEach, describe, expect, it } from 'vitest';
import useSettingsStore, { SETTINGS_STORAGE_KEY } from './settings.store';
import { DEFAULT_FONT_SIZE, Density, Theme } from '@shared/theme/theme';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({
    theme: Theme.LIGHT,
    density: Density.RELAXED,
    fontSize: DEFAULT_FONT_SIZE,
    sideBarCollapsed: false,
  });
});

describe('useSettingsStore', () => {
  describe('toggleTheme', () => {
    it('toggles from LIGHT to DARK', () => {
      useSettingsStore.getState().toggleTheme();
      expect(useSettingsStore.getState().theme).toBe(Theme.DARK);
    });

    it('toggles from DARK back to LIGHT', () => {
      useSettingsStore.setState({ theme: Theme.DARK });
      useSettingsStore.getState().toggleTheme();
      expect(useSettingsStore.getState().theme).toBe(Theme.LIGHT);
    });
  });

  describe('switchDensity', () => {
    it('updates density to TIGHT', () => {
      useSettingsStore.getState().switchDensity(Density.TIGHT);
      expect(useSettingsStore.getState().density).toBe(Density.TIGHT);
    });

    it('updates density to SUPER_TIGHT', () => {
      useSettingsStore.getState().switchDensity(Density.SUPER_TIGHT);
      expect(useSettingsStore.getState().density).toBe(Density.SUPER_TIGHT);
    });
  });

  describe('changeFontSize', () => {
    it('updates fontSize to the given value', () => {
      useSettingsStore.getState().changeFontSize(16);
      expect(useSettingsStore.getState().fontSize).toBe(16);
    });
  });

  describe('toggleSideBar', () => {
    it('collapses the sidebar when expanded', () => {
      useSettingsStore.getState().toggleSideBar();
      expect(useSettingsStore.getState().sideBarCollapsed).toBe(true);
    });

    it('expands the sidebar when collapsed', () => {
      useSettingsStore.setState({ sideBarCollapsed: true });
      useSettingsStore.getState().toggleSideBar();
      expect(useSettingsStore.getState().sideBarCollapsed).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('persists theme, density, fontSize, sideBarCollapsed to localStorage', () => {
      useSettingsStore.getState().toggleTheme();
      useSettingsStore.getState().switchDensity(Density.TIGHT);
      useSettingsStore.getState().changeFontSize(16);
      useSettingsStore.getState().toggleSideBar();

      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.theme).toBe(Theme.DARK);
      expect(parsed.state.density).toBe(Density.TIGHT);
      expect(parsed.state.fontSize).toBe(16);
      expect(parsed.state.sideBarCollapsed).toBe(true);
    });

    it('settings survive independent of auth (no identity in storage)', () => {
      useSettingsStore.getState().changeFontSize(18);
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.state.identity).toBeUndefined();
      expect(parsed.state.fontSize).toBe(18);
    });
  });
});
