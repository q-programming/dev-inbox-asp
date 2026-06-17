import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { Theme } from '@shared/theme/theme.ts';
import ProfileMenu from './ProfileMenu.tsx';

const mockMutate = vi.fn();

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const baseProfile = { firstName: 'Jane', lastName: 'Smith', theme: Theme.LIGHT };

function renderMenu() {
  return renderWithProviders(<ProfileMenu />);
}

beforeEach(() => {
  mockMutate.mockClear();
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: baseProfile,
    identity: { id: 1, email: 'jane@example.com', accountType: 'REGULAR' as never },
  });
});

describe('ProfileMenu', () => {
  it('should render the profile icon button', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /user profile/i })).toBeTruthy();
  });

  it('should open the menu when the profile button is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    expect(await screen.findByRole('menu')).toBeTruthy();
  });

  it('should display user initials derived from first and last name', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    expect(await screen.findByText('JS')).toBeTruthy();
  });

  it('should display the user email in the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    expect(await screen.findByText('jane@example.com')).toBeTruthy();
  });

  it('should show "?" initials when both first and last name are empty', async () => {
    useUserStore.setState({ profile: { firstName: '', lastName: '', theme: Theme.LIGHT } });
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    expect(await screen.findByText('?')).toBeTruthy();
  });

  it('should close the menu when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('should call logout mutation when Sign out is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it('should render Profile Settings menu item', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    expect(await screen.findByRole('menuitem', { name: /profile settings/i })).toBeTruthy();
  });

  it('should render Appearance menu item', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /user profile/i }));
    expect(await screen.findByRole('menuitem', { name: /appearance/i })).toBeTruthy();
  });
});
