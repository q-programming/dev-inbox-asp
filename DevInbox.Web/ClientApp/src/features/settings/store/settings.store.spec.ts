import { beforeEach, describe, expect, it } from 'vitest';
import useSettingsStore, {
  DEFAULT_SYNC_INTERVAL_MINUTES,
  SETTINGS_STORAGE_KEY,
  SYNC_INTERVAL_MIN_MINUTES,
} from './settings.store';
import { Density, Theme } from '@api';
import { DEFAULT_FONT_SIZE } from '@shared/theme/theme';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({
    theme: Theme.Light,
    density: Density.Relaxed,
    fontSize: DEFAULT_FONT_SIZE,
    sideBarCollapsed: false,
    syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
    sendNotifications: false,
  });
});

describe('useSettingsStore', () => {
  describe('toggleTheme', () => {
    it('toggles from LIGHT to DARK', () => {
      useSettingsStore.getState().toggleTheme();
      expect(useSettingsStore.getState().theme).toBe(Theme.Dark);
    });

    it('toggles from DARK back to LIGHT', () => {
      useSettingsStore.setState({ theme: Theme.Dark });
      useSettingsStore.getState().toggleTheme();
      expect(useSettingsStore.getState().theme).toBe(Theme.Light);
    });
  });

  describe('switchDensity', () => {
    it('updates density to TIGHT', () => {
      useSettingsStore.getState().switchDensity(Density.Tight);
      expect(useSettingsStore.getState().density).toBe(Density.Tight);
    });

    it('updates density to SUPER_TIGHT', () => {
      useSettingsStore.getState().switchDensity(Density.SuperTight);
      expect(useSettingsStore.getState().density).toBe(Density.SuperTight);
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

  describe('changeSyncIntervalMinutes', () => {
    it('updates syncIntervalMinutes to the given value', () => {
      useSettingsStore.getState().changeSyncIntervalMinutes(30);
      expect(useSettingsStore.getState().syncIntervalMinutes).toBe(30);
    });
  });

  describe('toggleSendNotifications', () => {
    it('enables notifications when disabled', () => {
      useSettingsStore.getState().toggleSendNotifications();
      expect(useSettingsStore.getState().sendNotifications).toBe(true);
    });

    it('disables notifications when enabled', () => {
      useSettingsStore.setState({ sendNotifications: true });
      useSettingsStore.getState().toggleSendNotifications();
      expect(useSettingsStore.getState().sendNotifications).toBe(false);
    });
  });

  describe('applyServerProfile', () => {
    it('applies theme, density, fontSize, sideBarCollapsed, syncIntervalMinutes and sendNotifications from the server', () => {
      useSettingsStore.getState().applyServerProfile({
        theme: Theme.Dark,
        density: Density.Tight,
        fontSize: 18,
        sideBarCollapsed: true,
        syncIntervalMinutes: 45,
        sendNotifications: true,
      });

      expect(useSettingsStore.getState()).toMatchObject({
        theme: Theme.Dark,
        density: Density.Tight,
        fontSize: 18,
        sideBarCollapsed: true,
        syncIntervalMinutes: 45,
        sendNotifications: true,
      });
    });

    it('preserves the existing value for fields the server does not provide', () => {
      useSettingsStore.setState({ syncIntervalMinutes: 25, sendNotifications: true });
      useSettingsStore.getState().applyServerProfile({});

      expect(useSettingsStore.getState().syncIntervalMinutes).toBe(25);
      expect(useSettingsStore.getState().sendNotifications).toBe(true);
    });

    it('accepts a syncIntervalMinutes value', () => {
      useSettingsStore.getState().applyServerProfile({ syncIntervalMinutes: SYNC_INTERVAL_MIN_MINUTES });
      expect(useSettingsStore.getState().syncIntervalMinutes).toBe(SYNC_INTERVAL_MIN_MINUTES);
    });
  });

  describe('localStorage persistence', () => {
    it('persists theme, density, fontSize, sideBarCollapsed to localStorage', () => {
      useSettingsStore.getState().toggleTheme();
      useSettingsStore.getState().switchDensity(Density.Tight);
      useSettingsStore.getState().changeFontSize(16);
      useSettingsStore.getState().toggleSideBar();

      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.theme).toBe(Theme.Dark);
      expect(parsed.state.density).toBe(Density.Tight);
      expect(parsed.state.fontSize).toBe(16);
      expect(parsed.state.sideBarCollapsed).toBe(true);
    });

    it('persists syncIntervalMinutes and sendNotifications to localStorage', () => {
      useSettingsStore.getState().changeSyncIntervalMinutes(40);
      useSettingsStore.getState().toggleSendNotifications();

      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.syncIntervalMinutes).toBe(40);
      expect(parsed.state.sendNotifications).toBe(true);
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
