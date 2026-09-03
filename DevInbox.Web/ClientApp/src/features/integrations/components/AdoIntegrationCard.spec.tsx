import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import useAlertStore from '@shared/store/alert.store';
import { AccountType, IntegrationDto, IntegrationStatus, IntegrationType } from '@api';
import AdoIntegrationCard from './AdoIntegrationCard';

const setIdentity = (integrations: IntegrationDto[]) => {
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
  setIdentity([]);
  useAlertStore.setState({ alerts: [] });
});

describe('AdoIntegrationCard', () => {
  describe('no organizations connected', () => {
    it('shows no connected badge and no organization rows', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.queryByTestId('ado-connected-badge')).toBeNull();
      expect(screen.queryByTestId('ado-organizations-list')).toBeNull();
    });

    it('shows the connect form with a disabled connect button until organization and token are entered', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getByTestId('ado-organization-input')).toBeTruthy();
      expect(screen.getByTestId('ado-pat-input')).toBeTruthy();
      expect(screen.getByTestId('ado-pat-expires-on-input')).toBeTruthy();
      expect(screen.getByTestId('ado-pat-connect-btn')).toBeDisabled();
    });

    it('enables the connect button once both organization and token are typed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-organization-input').querySelector('input')!, 'contoso');
      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_validtoken');

      expect(screen.getByTestId('ado-pat-connect-btn')).toBeEnabled();
    });
  });

  describe('connecting via PAT', () => {
    it('calls the connect endpoint with the organization, token and expiresAt value, then clears the form on success', async () => {
      let requestBody: { organization?: string; token?: string; expiresAt?: string } | undefined;
      server.use(
        http.post('/api/integrations/ado/pat', async ({ request }) => {
          requestBody = (await request.json()) as { organization?: string; token?: string; expiresAt?: string };
          return HttpResponse.json({ id: 1, status: IntegrationStatus.ACTIVE, type: IntegrationType.Ado, organization: requestBody.organization });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-organization-input').querySelector('input')!, 'contoso');
      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_validtoken');
      await user.type(screen.getByTestId('ado-pat-expires-on-input').querySelector('input')!, '2026-12-31');
      await user.click(screen.getByTestId('ado-pat-connect-btn'));

      await waitFor(() => expect(screen.getByTestId('ado-pat-input').querySelector('input')).toHaveValue(''));
      expect(requestBody?.organization).toBe('contoso');
      expect(requestBody?.token).toBe('ado_validtoken');
      expect(requestBody?.expiresAt).toContain('2026-12-31');
    });

    it('does not submit when only the organization (and not the token) is entered', async () => {
      let requestCount = 0;
      server.use(
        http.post('/api/integrations/ado/pat', () => {
          requestCount += 1;
          return HttpResponse.json({ id: 1, status: IntegrationStatus.ACTIVE, type: IntegrationType.Ado });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-organization-input').querySelector('input')!, 'contoso');
      expect(screen.getByTestId('ado-pat-connect-btn')).toBeDisabled();
      expect(requestCount).toBe(0);
    });

    it('shows the mutation error message and keeps the form filled when the PAT is rejected', async () => {
      server.use(http.post('/api/integrations/ado/pat', () => HttpResponse.json({}, { status: 400 })));
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.type(screen.getByTestId('ado-organization-input').querySelector('input')!, 'contoso');
      await user.type(screen.getByTestId('ado-pat-input').querySelector('input')!, 'ado_badtoken');
      await user.click(screen.getByTestId('ado-pat-connect-btn'));

      await waitFor(() =>
        expect(
          useAlertStore
            .getState()
            .alerts.some((alert) => alert.message === 'Could not validate that token — please check it (and the organization name) and try again.'),
        ).toBe(true),
      );
      expect(screen.getByTestId('ado-pat-input').querySelector('input')).toHaveValue('ado_badtoken');
      expect(screen.queryByTestId('ado-connected-badge')).toBeNull();
    });
  });

  describe('one organization connected', () => {
    beforeEach(() => {
      setIdentity([{ id: 1, type: IntegrationType.Ado, status: IntegrationStatus.ACTIVE, organization: 'contoso' }]);
    });

    it('shows the connected badge and a row for the organization with a disconnect button', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getAllByTestId('ado-connected-badge')).toHaveLength(2); // header badge + row badge
      expect(screen.getAllByTestId('ado-organization-row')).toHaveLength(1);
      expect(screen.getByText('contoso')).toBeTruthy();
      expect(screen.getByTestId('ado-disconnect-btn')).toBeTruthy();
    });

    it('still shows the connect form to add another organization', () => {
      renderWithProviders(<AdoIntegrationCard />);
      expect(screen.getByTestId('ado-organization-input')).toBeTruthy();
      expect(screen.getByTestId('ado-pat-input')).toBeTruthy();
    });

    it('calls the scoped disconnect endpoint and closes the confirmation modal', async () => {
      let requestedOrganization: string | undefined;
      server.use(
        http.delete('/api/integrations/ado/:organization', ({ params }) => {
          requestedOrganization = params.organization as string;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      await user.click(screen.getByTestId('ado-disconnect-btn'));
      await user.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(screen.queryByTestId('confirm-modal')).toBeNull());
      await waitFor(() => expect(requestedOrganization).toBe('contoso'));
    });

    it('closes the confirmation modal without disconnecting when cancel is clicked', async () => {
      let requestCount = 0;
      server.use(
        http.delete('/api/integrations/ado/:organization', () => {
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
        http.delete('/api/integrations/ado/:organization', () =>
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
  });

  describe('multiple organizations connected', () => {
    beforeEach(() => {
      setIdentity([
        { id: 1, type: IntegrationType.Ado, status: IntegrationStatus.ACTIVE, organization: 'contoso' },
        { id: 2, type: IntegrationType.Ado, status: IntegrationStatus.EXPIRED, organization: 'fabrikam' },
      ]);
    });

    it('shows one row per organization with its own status badge', () => {
      renderWithProviders(<AdoIntegrationCard />);
      const rows = screen.getAllByTestId('ado-organization-row');
      expect(rows).toHaveLength(2);
      expect(screen.getByText('contoso')).toBeTruthy();
      expect(screen.getByText('fabrikam')).toBeTruthy();
      expect(screen.getAllByTestId('ado-connected-badge')).toHaveLength(2); // header badge + contoso row badge
      expect(screen.getByTestId('ado-expired-badge')).toBeTruthy();
    });

    it('disconnects only the targeted organization', async () => {
      const requestedOrganizations: string[] = [];
      server.use(
        http.delete('/api/integrations/ado/:organization', ({ params }) => {
          requestedOrganizations.push(params.organization as string);
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdoIntegrationCard />);

      const disconnectButtons = screen.getAllByTestId('ado-disconnect-btn');
      await user.click(disconnectButtons[1]);
      await user.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(requestedOrganizations).toEqual(['fabrikam']));
    });
  });
});
