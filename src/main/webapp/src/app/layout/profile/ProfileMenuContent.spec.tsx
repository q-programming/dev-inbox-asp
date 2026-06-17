import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { Theme } from '@shared/theme/theme.ts';
import ProfileMenuContent from './ProfileMenuContent.tsx';

const mockMutate = vi.fn();
vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

// Render with a real anchor element so MUI Menu has something to position against
function renderContent(open = true) {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const result = renderWithProviders(
    <ProfileMenuContent anchorEl={anchor} open={open} onClose={vi.fn()} />,
  );
  return { ...result, anchor };
}

beforeEach(() => {
  mockMutate.mockClear();
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: { firstName: 'Jane', lastName: 'Smith', theme: Theme.LIGHT },
    identity: { id: 1, email: 'jane@example.com', accountType: 'REGULAR' as never },
  });
});

describe('ProfileMenuContent', () => {
  describe('user info', () => {
    it('should display user initials in the avatar', async () => {
      renderContent();
      expect((await screen.findByTestId('profile-avatar')).textContent).toBe('JS');
    });

    it('should display full name', async () => {
      renderContent();
      expect(await screen.findByTestId('profile-name')).toBeTruthy();
      expect((await screen.findByTestId('profile-name')).textContent).toBe('Jane Smith');
    });

    it('should display user email', async () => {
      renderContent();
      expect(await screen.findByTestId('profile-email')).toBeTruthy();
      expect((await screen.findByTestId('profile-email')).textContent).toBe('jane@example.com');
    });

    it('should show "?" initials when name is empty', async () => {
      useUserStore.setState({
        profile: { firstName: '', lastName: '', theme: Theme.LIGHT },
      });
      renderContent();
      expect((await screen.findByTestId('profile-avatar')).textContent).toBe('?');
    });

    it('should not render email when identity has no email', async () => {
      useUserStore.setState({ identity: null });
      renderContent();
      await screen.findByTestId('profile-avatar'); // wait for menu
      expect(screen.queryByTestId('profile-email')).toBeNull();
    });
  });

  describe('menu items', () => {
    it('should render Profile Settings item', async () => {
      renderContent();
      expect(await screen.findByRole('menuitem', { name: /profile settings/i })).toBeTruthy();
    });

    it('should render Appearance item', async () => {
      renderContent();
      expect(await screen.findByRole('menuitem', { name: /appearance/i })).toBeTruthy();
    });

    it('should render Sign out item', async () => {
      renderContent();
      expect(await screen.findByRole('menuitem', { name: /sign out/i })).toBeTruthy();
    });
  });

  describe('sign out', () => {
    it('should call logout mutation when Sign out is clicked', async () => {
      const user = userEvent.setup();
      renderContent();
      await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('closed state', () => {
    it('should not render menu items when open is false', () => {
      renderContent(false);
      expect(screen.queryByRole('menuitem')).toBeNull();
    });
  });
});
