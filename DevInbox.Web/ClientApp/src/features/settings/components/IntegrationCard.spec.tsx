import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import IntegrationCard from './IntegrationCard';
import type { IntegrationConfig } from '@feature/settings/types/settings.types';
import { IntegrationStatus } from '@api';

function makeConfig(overrides: Partial<IntegrationConfig> = {}): IntegrationConfig {
  return {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub account.',
    icon: <span>GH</span>,
    status: IntegrationStatus.INACTIVE,
    actionLabel: 'Connect',
    ...overrides,
  };
}

describe('IntegrationCard', () => {
  describe('active vs inactive state', () => {
    it('shows the status badge when active', () => {
      renderWithProviders(
        <IntegrationCard config={makeConfig({ status: IntegrationStatus.ACTIVE })} />,
      );
      expect(screen.getByTestId('integration-status-badge')).toBeTruthy();
    });

    it('hides the status badge when inactive', () => {
      renderWithProviders(<IntegrationCard config={makeConfig()} />);
      expect(screen.queryByTestId('integration-status-badge')).toBeNull();
    });

    it('shows connectedAs text and hides description when active', () => {
      renderWithProviders(
        <IntegrationCard
          config={makeConfig({ status: IntegrationStatus.ACTIVE, connectedAs: '@jane' })}
        />,
      );
      expect(screen.getByText(/connected as @jane/i)).toBeTruthy();
      expect(screen.queryByText('Connect your GitHub account.')).toBeNull();
    });

    it('shows description and hides connectedAs when inactive', () => {
      renderWithProviders(<IntegrationCard config={makeConfig({ connectedAs: '@jane' })} />);
      expect(screen.getByText('Connect your GitHub account.')).toBeTruthy();
      expect(screen.queryByText(/connected as/i)).toBeNull();
    });
  });

  describe('action button', () => {
    it('calls onAction when the action button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      renderWithProviders(<IntegrationCard config={makeConfig()} onAction={onAction} />);
      await user.click(screen.getByTestId('integration-action-btn'));
      expect(onAction).toHaveBeenCalledOnce();
    });

    it('does not throw when onAction is not provided', async () => {
      const user = userEvent.setup();
      renderWithProviders(<IntegrationCard config={makeConfig()} />);
      await user.click(screen.getByTestId('integration-action-btn'));
    });
  });
});
