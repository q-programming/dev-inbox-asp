/**
 * Integration tests for AppSidebar.
 * Individual building blocks are unit-tested in NavRow.spec.tsx and SectionLabel.spec.tsx.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { Theme } from '@shared/theme/theme.ts';
import AppSidebar from './AppSidebar.tsx';

const expandedProfile = {
  firstName: '',
  lastName: '',
  theme: Theme.LIGHT,
  sideBarCollapsed: false,
};
const collapsedProfile = {
  firstName: '',
  lastName: '',
  theme: Theme.LIGHT,
  sideBarCollapsed: true,
};

function renderSidebar() {
  return renderWithProviders(<AppSidebar />);
}

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: expandedProfile,
    identity: null,
  });
});

describe('AppSidebar', () => {
  describe('navigation items', () => {
    it('should render core FOCUS items — Inbox, Review requests, Mentions', () => {
      renderSidebar();
      expect(screen.getByText('Inbox')).toBeTruthy();
      expect(screen.getByText('Review requests')).toBeTruthy();
      expect(screen.getByText('Mentions')).toBeTruthy();
    });

    it('should render integration items — My PRs, ADO items', () => {
      renderSidebar();
      expect(screen.getByText('My PRs')).toBeTruthy();
      expect(screen.getByText('ADO items')).toBeTruthy();
    });

    it('should render the FILTERS section with filter items', () => {
      renderSidebar();
      expect(screen.getAllByText(/filters/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Unread')).toBeTruthy();
      expect(screen.getByText('Stale')).toBeTruthy();
    });
  });

  describe('collapse toggle', () => {
    it('should show collapse button when sidebar is expanded', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeTruthy();
    });

    it('should show expand button when sidebar is collapsed', () => {
      useUserStore.setState({ profile: collapsedProfile });
      renderSidebar();
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeTruthy();
    });

    it('should call toggleSideBar when collapse button is clicked', async () => {
      const user = userEvent.setup();
      renderSidebar();

      await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      expect(useUserStore.getState().profile.sideBarCollapsed).toBe(true);
    });

    it('should call toggleSideBar when expand button is clicked', async () => {
      useUserStore.setState({ profile: collapsedProfile });
      const user = userEvent.setup();
      renderSidebar();

      await user.click(screen.getByRole('button', { name: /expand sidebar/i }));

      expect(useUserStore.getState().profile.sideBarCollapsed).toBe(false);
    });
  });

  describe('collapsed mode', () => {
    it('should hide item labels when sidebar is collapsed', () => {
      useUserStore.setState({ profile: collapsedProfile });
      renderSidebar();
      // Labels should not be visible as text nodes (Tooltip replaces them)
      expect(screen.queryByText('Review requests')).toBeNull();
      expect(screen.queryByText('Mentions')).toBeNull();
    });
  });
});
