import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import IntegrationsSection from './IntegrationsSection';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import { AccountType, IntegrationStatus, IntegrationType } from '@api';

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    firstName: 'Jane',
    lastName: 'Dev',
    identity: {
      id: 1,
      email: 'jane@dev.com',
      accountType: AccountType.REGULAR,
      integrations: [
        { type: IntegrationType.Github, status: IntegrationStatus.INACTIVE },
        { type: IntegrationType.Ado, status: IntegrationStatus.INACTIVE },
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
          accountType: AccountType.REGULAR,
          integrations: [
            { type: IntegrationType.Github, status: IntegrationStatus.ACTIVE },
            { type: IntegrationType.Ado, status: IntegrationStatus.INACTIVE },
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
