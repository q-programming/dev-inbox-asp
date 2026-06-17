import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { Theme } from '@shared/theme/theme.ts';
import { AppRoute } from '@app/routes.ts';
import MobileBottomNav from './MobileBottomNav.tsx';

const mockMutate = vi.fn();

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

function renderNav(initialEntry = AppRoute.INBOX) {
  return renderWithProviders(<MobileBottomNav />, { initialEntries: [initialEntry] });
}

beforeEach(() => {
  mockMutate.mockClear();
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: { firstName: 'Jane', lastName: 'Smith', theme: Theme.LIGHT },
    identity: { id: 1, email: 'jane@example.com', accountType: 'REGULAR' as never },
  });
});

describe('MobileBottomNav', () => {
  describe('navigation items', () => {
    it('should render Inbox, Notes, and Profile tabs', () => {
      renderNav();
      expect(screen.getByText('Inbox')).toBeTruthy();
      expect(screen.getByText('Notes')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });

    it('should not render a Settings tab', () => {
      renderNav();
      expect(screen.queryByText('Settings')).toBeNull();
    });

    it('should render the FAB add-note button', () => {
      renderNav();
      expect(screen.getByRole('button', { name: /add note/i })).toBeTruthy();
    });
  });

  describe('profile menu', () => {
    it('should open profile menu when Profile tab is clicked', async () => {
      const user = userEvent.setup();
      renderNav();
      await user.click(screen.getByRole('button', { name: /open profile menu/i }));
      expect(await screen.findByRole('menu')).toBeTruthy();
    });

    it('should show user email in the profile menu', async () => {
      const user = userEvent.setup();
      renderNav();
      await user.click(screen.getByRole('button', { name: /open profile menu/i }));
      expect(await screen.findByText('jane@example.com')).toBeTruthy();
    });

    it('should call logout when Sign out is clicked', async () => {
      const user = userEvent.setup();
      renderNav();
      await user.click(screen.getByRole('button', { name: /open profile menu/i }));
      await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
