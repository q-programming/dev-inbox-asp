import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { Density, Theme } from '@api';
import AppearanceSettingsActions from './AppearanceSettingsActions';

const INITIAL_SETTINGS = {
  theme: Theme.Light,
  density: Density.Relaxed,
  fontSize: 14,
  sideBarCollapsed: false,
};

const UPDATED_SETTINGS_RESPONSE = {
  theme: Theme.Dark,
  density: Density.Tight,
  fontSize: 16,
  sideBarCollapsed: true,
};

beforeEach(() => {
  useSettingsStore.setState({ ...INITIAL_SETTINGS });
  useAlertStore.setState({ alerts: [] });
});

describe('AppearanceSettingsActions', () => {
  it('renders both the Cancel and Save Changes buttons', () => {
    renderWithProviders(<AppearanceSettingsActions />);

    expect(screen.getByTestId('settings-cancel-btn')).toBeInTheDocument();
    expect(screen.getByTestId('settings-save-btn')).toBeInTheDocument();
  });

  describe('save changes', () => {
    it('sends the current store settings to the API and shows a success alert', async () => {
      let requestBody: unknown;
      server.use(
        http.put('/api/settings', async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(UPDATED_SETTINGS_RESPONSE);
        }),
      );
      const user = userEvent.setup();
      useSettingsStore.setState({ theme: Theme.Dark, density: Density.Tight, fontSize: 16 });

      renderWithProviders(<AppearanceSettingsActions />);
      await user.click(screen.getByTestId('settings-save-btn'));

      await waitFor(() => {
        expect(useAlertStore.getState().alerts).toHaveLength(1);
      });
      expect(requestBody).toMatchObject({
        theme: Theme.Dark,
        density: Density.Tight,
        fontSize: 16,
      });
      expect(useAlertStore.getState().alerts[0]).toMatchObject({
        type: AlertType.SUCCESS,
        message: 'Settings updated',
      });
    });

    it('does not show a success alert when the save request fails', async () => {
      server.use(http.put('/api/settings', () => HttpResponse.json({}, { status: 500 })));
      const user = userEvent.setup();

      renderWithProviders(<AppearanceSettingsActions />);
      await user.click(screen.getByTestId('settings-save-btn'));

      await waitFor(() => {
        expect(useAlertStore.getState().alerts).toHaveLength(1);
      });
      expect(useAlertStore.getState().alerts[0]).toMatchObject({ type: AlertType.ERROR });
      expect(useSettingsStore.getState().theme).toBe(Theme.Light);
    });
  });

  describe('cancel changes', () => {
    it('reverts the store back to the last-saved settings when clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<AppearanceSettingsActions />);
      // Simulate the user changing something locally without saving yet.
      useSettingsStore.setState({ theme: Theme.Dark, density: Density.Tight, fontSize: 18 });

      await user.click(screen.getByTestId('settings-cancel-btn'));

      await waitFor(() => {
        expect(useSettingsStore.getState()).toMatchObject(INITIAL_SETTINGS);
      });
    });

    it('reverts to the values from the most recent successful save, not the original mount state', async () => {
      server.use(http.put('/api/settings', () => HttpResponse.json(UPDATED_SETTINGS_RESPONSE)));
      const user = userEvent.setup();
      useSettingsStore.setState({ theme: Theme.Dark, density: Density.Tight, fontSize: 16 });

      renderWithProviders(<AppearanceSettingsActions />);
      await user.click(screen.getByTestId('settings-save-btn'));
      await waitFor(() => expect(useAlertStore.getState().alerts).toHaveLength(1));

      // Make further unsaved local edits after the save completed.
      useSettingsStore.setState({ theme: Theme.Light, sideBarCollapsed: false });

      await user.click(screen.getByTestId('settings-cancel-btn'));

      await waitFor(() => {
        expect(useSettingsStore.getState()).toMatchObject(UPDATED_SETTINGS_RESPONSE);
      });
    });
  });
});
