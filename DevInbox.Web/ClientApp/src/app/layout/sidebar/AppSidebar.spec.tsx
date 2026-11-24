/**
 * Integration tests for AppSidebar.
 * Individual building blocks are unit-tested in NavRow.spec.tsx and SectionLabel.spec.tsx.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import useSettingsStore from '@feature/settings/store/settings.store';
import AppSidebar from './AppSidebar.tsx';

vi.mock('@feature/inbox/hooks/useInboxQuery.tsx', () => ({
  useInboxSummaryQuery: () => ({ data: undefined }),
  useUserTeams: () => ({ data: ['org/project/team a'], isLoading: false }),
  useUserRepos: () => ({ data: [], isLoading: false }),
}));

function renderSidebar() {
  return renderWithProviders(<AppSidebar />);
}

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    firstName: '',
    lastName: '',
    identity: null,
  });
  useSettingsStore.setState({ sideBarCollapsed: false });
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
      expect(screen.getByText('To Do')).toBeTruthy();
      expect(screen.getByText('Stale')).toBeTruthy();
    });
  });

  describe('scope entries', () => {
    it('should highlight the scope entry matching the scope query param', async () => {
      renderWithProviders(<AppSidebar />, { initialEntries: ['/inbox?scope=org%2Fproject%2Fteam+a'] });
      await userEvent.click(screen.getByText('Teams'));

      const entry = await screen.findByText('team a');
      expect(entry.closest('a')?.className).toContain('Mui-selected');
    });
  });

  describe('collapse toggle', () => {
    it('should show collapse button when sidebar is expanded', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeTruthy();
    });

    it('should show expand button when sidebar is collapsed', () => {
      useSettingsStore.setState({ sideBarCollapsed: true });
      renderSidebar();
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeTruthy();
    });

    it('should call toggleSideBar when collapse button is clicked', async () => {
      const user = userEvent.setup();
      renderSidebar();

      await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      expect(useSettingsStore.getState().sideBarCollapsed).toBe(true);
    });

    it('should call toggleSideBar when expand button is clicked', async () => {
      useSettingsStore.setState({ sideBarCollapsed: true });
      const user = userEvent.setup();
      renderSidebar();

      await user.click(screen.getByRole('button', { name: /expand sidebar/i }));

      expect(useSettingsStore.getState().sideBarCollapsed).toBe(false);
    });
  });

  describe('collapsed mode', () => {
    it('should hide item labels when sidebar is collapsed', () => {
      useSettingsStore.setState({ sideBarCollapsed: true });
      renderSidebar();
      // Labels should not be visible as text nodes (Tooltip replaces them)
      expect(screen.queryByText('Review requests')).toBeNull();
      expect(screen.queryByText('Mentions')).toBeNull();
    });
  });
});
