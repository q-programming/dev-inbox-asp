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
      integrations: [{ type: IntegrationType.Github, status: IntegrationStatus.INACTIVE }],
    },
  });
});

describe('IntegrationsSection', () => {
  it('renders the GitHub integration card', () => {
    renderWithProviders(<IntegrationsSection />);
    expect(screen.getByTestId('github-pat-connect-btn')).toBeTruthy();
  });

  it('shows the connected badge when GitHub is active', () => {
    useUserStore.setState({
      identity: {
        id: 1,
        email: 'jane@dev.com',
        accountType: AccountType.REGULAR,
        integrations: [{ type: IntegrationType.Github, status: IntegrationStatus.ACTIVE }],
      },
    });
    renderWithProviders(<IntegrationsSection />);
    expect(screen.getByTestId('github-connected-badge')).toBeTruthy();
  });

  it('renders the Azure DevOps integration card', () => {
    renderWithProviders(<IntegrationsSection />);
    expect(screen.getByTestId('ado-pat-connect-btn')).toBeTruthy();
  });
});
