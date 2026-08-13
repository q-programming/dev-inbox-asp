import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import { AccountType, IntegrationStatus, IntegrationType } from '@api';
import GithubIntegrationCard from './GithubIntegrationCard';

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
  setIdentity([{ type: IntegrationType.Github, status: IntegrationStatus.INACTIVE }]);
});

describe('GithubIntegrationCard', () => {
  describe('disconnected state', () => {
    it('shows no connected badge and no expired badge', () => {
      renderWithProviders(<GithubIntegrationCard />);
      expect(screen.queryByTestId('github-connected-badge')).toBeNull();
      expect(screen.queryByTestId('github-expired-badge')).toBeNull();
    });

    it('defaults to the PAT mode with a disabled connect button until a token is entered', () => {
      renderWithProviders(<GithubIntegrationCard />);
      expect(screen.getByTestId('github-pat-input')).toBeTruthy();
      expect(screen.getByTestId('github-pat-connect-btn')).toBeDisabled();
    });

    it('enables the connect button once a token is typed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<GithubIntegrationCard />);

      await user.type(screen.getByTestId('github-pat-input').querySelector('input')!, 'ghp_sometoken');

      expect(screen.getByTestId('github-pat-connect-btn')).toBeEnabled();
    });

    it('switches to the OAuth App mode and shows the GitHub connect button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<GithubIntegrationCard />);

      await user.click(screen.getByTestId('github-mode-oauth'));

      expect(screen.getByTestId('github-oauth-connect-btn')).toBeTruthy();
      expect(screen.queryByTestId('github-pat-input')).toBeNull();
    });
  });

  describe('connecting via PAT', () => {
    it('calls the connect endpoint and updates the store to ACTIVE on success', async () => {
      server.use(
        http.post('/api/integrations/github/pat', () =>
          HttpResponse.json({ id: 1, status: IntegrationStatus.ACTIVE, type: IntegrationType.Github }),
        ),
      );
      const user = userEvent.setup();
      renderWithProviders(<GithubIntegrationCard />);

      await user.type(screen.getByTestId('github-pat-input').querySelector('input')!, 'ghp_validtoken');
      await user.click(screen.getByTestId('github-pat-connect-btn'));

      await waitFor(() => expect(screen.getByTestId('github-connected-badge')).toBeTruthy());
      expect(
        useUserStore
          .getState()
          .identity?.integrations?.find((entry) => entry.type === IntegrationType.Github)?.status,
      ).toBe(IntegrationStatus.ACTIVE);
    });

    it('does not submit when the token field is only whitespace', async () => {
      let requestCount = 0;
      server.use(
        http.post('/api/integrations/github/pat', () => {
          requestCount += 1;
          return HttpResponse.json({ id: 1, status: IntegrationStatus.ACTIVE, type: IntegrationType.Github });
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<GithubIntegrationCard />);

      await user.type(screen.getByTestId('github-pat-input').querySelector('input')!, '   ');
      expect(screen.getByTestId('github-pat-connect-btn')).toBeDisabled();
      expect(requestCount).toBe(0);
    });

    it('keeps the integration inactive and surfaces an error when the token is rejected', async () => {
      server.use(
        http.post('/api/integrations/github/pat', () => HttpResponse.json({}, { status: 400 })),
      );
      const user = userEvent.setup();
      renderWithProviders(<GithubIntegrationCard />);

      await user.type(screen.getByTestId('github-pat-input').querySelector('input')!, 'ghp_badtoken');
      await user.click(screen.getByTestId('github-pat-connect-btn'));

      await waitFor(() =>
        expect(
          useUserStore
            .getState()
            .identity?.integrations?.find((entry) => entry.type === IntegrationType.Github)?.status,
        ).toBe(IntegrationStatus.INACTIVE),
      );
      expect(screen.queryByTestId('github-connected-badge')).toBeNull();
      // Input is only cleared on success — a rejected token stays visible so the user can retry.
      expect(screen.getByTestId('github-pat-input').querySelector('input')).toHaveValue('ghp_badtoken');
    });
  });

  describe('connected state', () => {
    beforeEach(() => {
      setIdentity([{ type: IntegrationType.Github, status: IntegrationStatus.ACTIVE }]);
    });

    it('shows the connected badge and a disconnect button instead of the connect form', () => {
      renderWithProviders(<GithubIntegrationCard />);
      expect(screen.getByTestId('github-connected-badge')).toBeTruthy();
      expect(screen.getByTestId('github-disconnect-btn')).toBeTruthy();
      expect(screen.queryByTestId('github-pat-input')).toBeNull();
    });

    it('disconnects and reverts the store to inactive on success', async () => {
      server.use(http.delete('/api/integrations/github', () => new HttpResponse(null, { status: 204 })));
      const user = userEvent.setup();
      renderWithProviders(<GithubIntegrationCard />);

      await user.click(screen.getByTestId('github-disconnect-btn'));

      await waitFor(() => expect(screen.queryByTestId('github-connected-badge')).toBeNull());
      expect(
        useUserStore
          .getState()
          .identity?.integrations?.find((entry) => entry.type === IntegrationType.Github),
      ).toBeUndefined();
    });
  });

  describe('expired token state', () => {
    beforeEach(() => {
      setIdentity([{ type: IntegrationType.Github, status: IntegrationStatus.EXPIRED }]);
    });

    it('shows the expired badge and the reconnect form rather than the connected view', () => {
      renderWithProviders(<GithubIntegrationCard />);
      expect(screen.getByTestId('github-expired-badge')).toBeTruthy();
      expect(screen.queryByTestId('github-connected-badge')).toBeNull();
      expect(screen.getByTestId('github-pat-input')).toBeTruthy();
    });
  });
});
