/**
 * Integration tests for AppHeader.
 * ProfileMenu behaviour is unit-tested in ProfileMenu.spec.tsx.
 * HeaderLogo is unit-tested in HeaderLogo.spec.tsx.
 * GlobalSearch is unit-tested in GlobalSearch.spec.tsx.
 * MobileSearchBar is unit-tested in MobileSearchBar.spec.tsx.
 *
 * These tests cover the AppHeader shell: composition of regions and
 * mobile-specific behaviour (search expand/collapse).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { Theme } from '@shared/theme/theme.ts';
import AppHeader from './AppHeader.tsx';

const mockMutate = vi.fn();

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const baseProfile = { firstName: 'Jane', lastName: 'Smith', theme: Theme.LIGHT };

function renderHeader(onMenuOpen = vi.fn()) {
  return renderWithProviders(<AppHeader onMenuOpen={onMenuOpen} />);
}

beforeEach(() => {
  mockMutate.mockClear();
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: baseProfile,
    identity: { id: 1, email: 'jane@example.com', accountType: 'REGULAR' as never },
  });
});

describe('AppHeader', () => {
  describe('wordmark and navigation', () => {
    it('should render the Dev Inbox wordmark', () => {
      renderHeader();
      expect(screen.getByText('Dev Inbox')).toBeTruthy();
    });

    it('should render the logo as a link to home', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /dev inbox/i })).toBeTruthy();
    });
  });

  describe('hamburger menu', () => {
    it('should call onMenuOpen when hamburger button is clicked', async () => {
      const user = userEvent.setup();
      const onMenuOpen = vi.fn();
      renderHeader(onMenuOpen);

      await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

      expect(onMenuOpen).toHaveBeenCalledOnce();
    });
  });

  describe('mobile search', () => {
    it('should render the mobile search icon button', () => {
      renderHeader();
      expect(screen.getByRole('button', { name: /open search/i })).toBeTruthy();
    });

    it('should hide hamburger and logo when mobile search is expanded', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(screen.getByRole('button', { name: /open search/i }));

      expect(screen.queryByRole('button', { name: /open navigation menu/i })).toBeNull();
      expect(screen.queryByText('Dev Inbox')).toBeNull();
    });

    it('should show the search input when mobile search is expanded', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(screen.getByRole('button', { name: /open search/i }));

      // input is inside the mobile-only Box; query by placeholder which doesn't filter visibility
      expect(screen.getAllByPlaceholderText(/search across all streams/i).length).toBeGreaterThan(
        0,
      );
    });

    it('should restore hamburger and logo when search is closed', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.click(screen.getByRole('button', { name: /close search/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeTruthy();
        expect(screen.getByText('Dev Inbox')).toBeTruthy();
      });
    });
  });
});
