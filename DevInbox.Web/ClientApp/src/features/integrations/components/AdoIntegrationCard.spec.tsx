import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import useAlertStore from '@shared/store/alert.store';
import { AccountType, IntegrationStatus, IntegrationType } from '@api';
import AdoIntegrationCard from './AdoIntegrationCard';

const setIdentity = (integrations: { type: IntegrationType; status: IntegrationStatus }[]) => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    firstName: 'Jane',
    lastName: 'Dev',
    identity: {
      id: 1,
      email: 'jane@dev.com',
      accountType: AccountType.REGULAR,
      integrations,
    },
  });
};

beforeEach(() => {
  setIdentity([{ type: IntegrationType.Ado, status: IntegrationStatus.INACTIVE }]);
  useAlertStore.setState({ alerts: [] });
});

describe('AdoIntegrationCard', () => {
  describe('disconnected state', () => {
    it('shows no connected badge and no expired badge', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.queryByTestId('ado-connected-badge')).toBeNull();
      expect(screen.queryByTestId('ado-expired-badge')).toBeNull();
    });

    it('shows the PAT form with a disabled connect button until a token is entered', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getByTestId('ado-pat-input')).toBeTruthy();
      expect(screen.getByTestId('ado-pat-expires-on-input')).toBeTruthy();
      expect(screen.getByTestId('ado-pat-connect-btn')).toBeDisabled();
      expect(screen.queryByText('GitHub App')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Personal Access Token' })).toBeNull();
    });

    it('enables the connect button once a token is typed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_validtoken');

      expect(screen.getByTestId('ado-pat-connect-btn')).toBeEnabled();
    });
  });

  describe('connecting via PAT', () => {
    it('calls the connect endpoint with the entered token and expiresAt value, then clears the token field on success', async () => {
      let requestBody: { token?: string; expiresAt?: string } | undefined;
      server.use(
        http.post('/api/integrations/ado/pat', async ({ request }) => {
          requestBody = (await request.json()) as { token?: string; expiresAt?: string };
          return HttpResponse.json({ id: 1, status: IntegrationStatus.ACTIVE, type: IntegrationType.Ado });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_validtoken');
      await user.type(screen.getByTestId('ado-pat-expires-on-input').querySelector('input')!, '2026-12-31');
      await user.click(screen.getByTestId('ado-pat-connect-btn'));

      await waitFor(() => expect(screen.getByTestId('ado-pat-input').querySelector('input')).toHaveValue(''));
      expect(requestBody?.token).toBe('ado_validtoken');
      expect(requestBody?.expiresAt).toContain('2026-12-31');
    });

    it('disables the connect button while the connect request is pending', async () => {
      let resolveRequest: (() => void) | undefined;
      server.use(
        http.post('/api/integrations/ado/pat', () =>
          new Promise((resolve) => {
            resolveRequest = () =>
              resolve(
                HttpResponse.json({
                  id: 1,
                  status: IntegrationStatus.ACTIVE,
                  type: IntegrationType.Ado,
                }),
              );
          }),
        ),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_validtoken');
      await user.click(screen.getByTestId('ado-pat-connect-btn'));

      expect(screen.getByTestId('ado-pat-connect-btn')).toBeDisabled();

      resolveRequest?.();
      await waitFor(() =>
        expect(screen.getByTestId('ado-pat-input').querySelector('input')).toHaveValue(''),
      );
    });

    it('does not submit when the token field is only whitespace', async () => {
      let requestCount = 0;
      server.use(
        http.post('/api/integrations/ado/pat', () => {
          requestCount += 1;
          return HttpResponse.json({ id: 1, status: IntegrationStatus.ACTIVE, type: IntegrationType.Ado });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, '   ');
      expect(screen.getByTestId('ado-pat-connect-btn')).toBeDisabled();
      expect(requestCount).toBe(0);
    });

    it('shows the mutation error message and keeps the token visible when the PAT is rejected', async () => {
      server.use(http.post('/api/integrations/ado/pat', () => HttpResponse.json({}, { status: 400 })));
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_badtoken');
      await user.click(screen.getByTestId('ado-pat-connect-btn'));

      await waitFor(() =>
        expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Could not validate that token — please check it and try again.')).toBe(true),
      );
      expect(screen.getByTestId('ado-pat-input').querySelector('input')).toHaveValue('ado_badtoken');
      expect(screen.queryByTestId('ado-connected-badge')).toBeNull();
    });
  });

  describe('connected state', () => {
    beforeEach(() => {
      setIdentity([{ type: IntegrationType.Ado, status: IntegrationStatus.ACTIVE }]);
    });

    it('shows the connected badge and a disconnect button instead of the connect form', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getByTestId('ado-connected-badge')).toBeTruthy();
      expect(screen.getByTestId('ado-disconnect-btn')).toBeTruthy();
      expect(screen.queryByTestId('ado-pat-input')).toBeNull();
      expect(screen.queryByText('GitHub App')).toBeNull();
    });

    it('calls the disconnect endpoint and closes the confirmation modal', async () => {
      let requestCount = 0;
      server.use(
        http.delete('/api/integrations/ado', () => {
          requestCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.click(screen.getByTestId('ado-disconnect-btn'));
      await user.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(screen.queryByTestId('confirm-modal')).toBeNull());
      await waitFor(() => expect(requestCount).toBe(1));
    });

    it('closes the confirmation modal without disconnecting when cancel is clicked', async () => {
      let requestCount = 0;
      server.use(
        http.delete('/api/integrations/ado', () => {
          requestCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.click(screen.getByTestId('ado-disconnect-btn'));
      await user.click(screen.getByTestId('confirm-modal-cancel'));

      await waitFor(() => expect(screen.queryByTestId('confirm-modal')).toBeNull());
      expect(requestCount).toBe(0);
    });

    it('disables the disconnect button while the disconnect request is pending', async () => {
      let resolveRequest: (() => void) | undefined;
      server.use(
        http.delete('/api/integrations/ado', () =>
          new Promise((resolve) => {
            resolveRequest = () => resolve(new HttpResponse(null, { status: 204 }));
          }),
        ),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.click(screen.getByTestId('ado-disconnect-btn'));
      await user.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(screen.getByTestId('ado-disconnect-btn')).toBeDisabled());
      resolveRequest?.();
      await waitFor(() => expect(screen.getByTestId('ado-disconnect-btn')).toBeEnabled());
    });

    it('lists the discovered organizations', async () => {
      server.use(
        http.get('/api/integrations/ado/organizations', () =>
          HttpResponse.json([{ name: 'contoso' }, { name: 'fabrikam' }]),
        ),
      );
      renderWithProviders(<AdoIntegrationCard />);

      await waitFor(() => expect(screen.getAllByTestId('ado-organization-chip')).toHaveLength(2));
      expect(screen.getByText('contoso')).toBeTruthy();
      expect(screen.getByText('fabrikam')).toBeTruthy();
    });

    it('shows a message when no organizations are found yet', async () => {
      server.use(http.get('/api/integrations/ado/organizations', () => HttpResponse.json([])));
      renderWithProviders(<AdoIntegrationCard />);

      await waitFor(() =>
        expect(
          screen.getByText('No organizations found yet — add one below, or trigger a sync to auto-discover them.'),
        ).toBeTruthy(),
      );
    });

    it('adds an organization and shows it in the list on success', async () => {
      server.use(
        http.get('/api/integrations/ado/organizations', () => HttpResponse.json([{ name: 'contoso' }])),
        http.post('/api/integrations/ado/organizations', async ({ request }) => {
          const body = (await request.json()) as { organizationName?: string };
          return HttpResponse.json([{ name: 'contoso' }, { name: body.organizationName }]);
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await waitFor(() => expect(screen.getAllByTestId('ado-organization-chip')).toHaveLength(1));

      await user.type(screen.getByTestId('ado-add-organization-input').querySelector('input')!, 'fabrikam');
      await user.click(screen.getByTestId('ado-add-organization-btn'));

      await waitFor(() => expect(screen.getAllByTestId('ado-organization-chip')).toHaveLength(2));
      expect(screen.getByText('fabrikam')).toBeTruthy();
      expect(screen.getByTestId('ado-add-organization-input').querySelector('input')).toHaveValue('');
    });

    it('shows an error message when adding an organization fails', async () => {
      server.use(
        http.get('/api/integrations/ado/organizations', () => HttpResponse.json([])),
        http.post('/api/integrations/ado/organizations', () => HttpResponse.json({}, { status: 400 })),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-add-organization-input').querySelector('input')!, 'unreachable');
      await user.click(screen.getByTestId('ado-add-organization-btn'));

      await waitFor(() =>
        expect(
          useAlertStore
            .getState()
            .alerts.some(
              (alert) =>
                alert.message ===
                'Could not access that organization with the connected token — please check the name and try again.',
            ),
        ).toBe(true),
      );
      expect(screen.getByTestId('ado-add-organization-input').querySelector('input')).toHaveValue('unreachable');
    });

    it('disables the add button until an organization name is entered', () => {
      server.use(http.get('/api/integrations/ado/organizations', () => HttpResponse.json([])));
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getByTestId('ado-add-organization-btn')).toBeDisabled();
    });
  });

  describe('expired token state', () => {
    beforeEach(() => {
      setIdentity([{ type: IntegrationType.Ado, status: IntegrationStatus.EXPIRED }]);
    });

    it('shows the expired badge and the reconnect form rather than the connected view', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getByTestId('ado-expired-badge')).toBeTruthy();
      expect(screen.queryByTestId('ado-connected-badge')).toBeNull();
      expect(screen.getByTestId('ado-pat-input')).toBeTruthy();
      expect(screen.getByTestId('ado-disconnect-btn')).toBeTruthy();
    });

    it('allows the expired integration to be disconnected', async () => {
      let requestCount = 0;
      server.use(
        http.delete('/api/integrations/ado', () => {
          requestCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.click(screen.getByTestId('ado-disconnect-btn'));
      await user.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(requestCount).toBe(1));
    });
  });
});
