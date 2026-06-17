import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import IntegrationsSection from './IntegrationsSection';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import { Density, Theme } from '@shared/theme/theme';
import { IntegrationStatus, IntegrationType } from '@api/shared';

const baseProfile = {
  firstName: 'Jane',
  lastName: 'Dev',
  theme: Theme.LIGHT,
  density: Density.RELAXED,
  fontSize: 14,
};

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: baseProfile,
    identity: {
      id: 1,
      email: 'jane@dev.com',
      accountType: 'REGULAR' as const,
      integrations: [
        { type: IntegrationType.Github, status: IntegrationStatus.Inactive },
        { type: IntegrationType.Ado, status: IntegrationStatus.Inactive },
      ],
    },
  });
});

describe('IntegrationsSection', () => {
  describe('status-driven rendering', () => {
    it('shows the active badge only for connected integrations', () => {
      useUserStore.setState({
        identity: {
          id: 1,
          email: 'jane@dev.com',
          accountType: 'REGULAR' as const,
          integrations: [
            { type: IntegrationType.Github, status: IntegrationStatus.Active },
            { type: IntegrationType.Ado, status: IntegrationStatus.Inactive },
          ],
        },
      });
      renderWithProviders(<IntegrationsSection />);
      expect(screen.getAllByTestId('integration-status-badge')).toHaveLength(1);
    });

    it('shows no active badges when all integrations are inactive', () => {
      renderWithProviders(<IntegrationsSection />);
      expect(screen.queryAllByTestId('integration-status-badge')).toHaveLength(0);
    });

    it('shows no integration cards when identity is null', () => {
      useUserStore.setState({ identity: null });
      renderWithProviders(<IntegrationsSection />);
      expect(screen.queryAllByTestId('integration-action-btn')).toHaveLength(0);
    });
  });

  describe('action buttons', () => {
    it('renders one action button per integration', () => {
      renderWithProviders(<IntegrationsSection />);
      expect(screen.getAllByTestId('integration-action-btn')).toHaveLength(2);
    });
  });
});
