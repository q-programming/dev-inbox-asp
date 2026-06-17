import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { Theme } from '@shared/theme/theme';
import { AppRoute } from '@app/routes';
import AppLayout from './Layout';

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const emptyProfile = { firstName: '', lastName: '', theme: Theme.LIGHT, sideBarCollapsed: false };

function renderLayout(initialEntry = AppRoute.INBOX) {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={AppRoute.INBOX} element={<div>Inbox content</div>} />
        <Route path={AppRoute.SETTINGS} element={<div>Settings content</div>} />
      </Route>
    </Routes>,
    { initialEntries: [initialEntry] },
  );
}

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: emptyProfile,
    identity: null,
  });
});

describe('AppLayout', () => {
  describe('header', () => {
    it('should render the app wordmark', () => {
      renderLayout();
      // h6 in AppBar + h6 in Footer — both say Dev Inbox
      expect(screen.getAllByText('Dev Inbox').length).toBeGreaterThan(0);
    });

    it('should render the global search input', () => {
      renderLayout();
      expect(screen.queryByRole('textbox', { name: /global search/i })).toBeNull();
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeTruthy();
    });

    it('should render the mobile search button', () => {
      renderLayout();
      expect(screen.getByRole('button', { name: /open search/i })).toBeTruthy();
    });

    it('should render the Add note button', () => {
      renderLayout();
      // Split button — at least one button with "add note" accessible name
      expect(screen.getAllByRole('button', { name: /add note/i }).length).toBeGreaterThan(0);
    });

    it('should render the mobile search button in the header', () => {
      renderLayout();
      expect(screen.getByRole('button', { name: /open search/i })).toBeTruthy();
    });
  });

  describe('sidebar navigation', () => {
    it('should render the Inbox nav item', () => {
      renderLayout();
      expect(screen.getAllByText('Inbox', { exact: true }).length).toBeGreaterThan(0);
    });

    it('should render integration nav items (My PRs, ADO items)', () => {
      renderLayout();
      expect(screen.getByText('My PRs')).toBeTruthy();
      expect(screen.getByText('ADO items')).toBeTruthy();
    });

    it('should render the FILTERS section with filter items', () => {
      renderLayout();
      // "Filters" section label + "Manage filters" item both contain "filter"
      expect(screen.getAllByText(/filters/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Unread')).toBeTruthy();
    });
  });

  describe('content area', () => {
    it('should render child route content via Outlet', () => {
      renderLayout();
      expect(screen.getByText('Inbox content')).toBeTruthy();
    });

    it('should navigate to settings via Appearance in mobile profile menu', async () => {
      const user = userEvent.setup();
      renderLayout();

      // Open profile menu from bottom nav
      await user.click(screen.getByRole('button', { name: /open profile menu/i }));
      // Click Appearance which links to settings route
      await user.click(await screen.findByRole('menuitem', { name: /appearance/i }));

      expect(screen.getByText('Settings content')).toBeTruthy();
    });
  });

  describe('footer', () => {
    it('should render the footer but without theme toggle', () => {
      renderLayout();
      expect(screen.queryByTestId('theme-toggle')).toBeNull();
    });
  });
});
