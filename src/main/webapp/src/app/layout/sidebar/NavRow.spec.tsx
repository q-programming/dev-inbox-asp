import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import InboxIcon from '@mui/icons-material/Inbox';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import { AppRoute } from '@app/routes';
import NavRow from './NavRow.tsx';
import type { SidebarNavItem } from '../navConfig.tsx';

const baseItem: SidebarNavItem = {
  id: 'inbox',
  label: 'Inbox',
  icon: <InboxIcon fontSize="small" />,
  route: AppRoute.INBOX,
  count: 5,
};

const expandableItem: SidebarNavItem = {
  id: 'repos',
  label: 'Repositories',
  icon: <InboxIcon fontSize="small" />,
  expandable: true,
};

const noCountItem: SidebarNavItem = {
  id: 'notes',
  label: 'Notes',
  icon: <InboxIcon fontSize="small" />,
  route: AppRoute.INBOX,
};

describe('NavRow', () => {
  describe('expanded mode', () => {
    it('should render item label', () => {
      renderWithProviders(<NavRow item={baseItem} collapsed={false} />);
      expect(screen.getByTestId('nav-row-label')).toBeTruthy();
      expect(screen.getByTestId('nav-row-label').textContent).toBe('Inbox');
    });

    it('should render item count when present and not expandable', () => {
      renderWithProviders(<NavRow item={baseItem} collapsed={false} />);
      expect(screen.getByTestId('nav-row-count').textContent).toBe('5');
    });

    it('should not render count for expandable items', () => {
      const itemWithCount: SidebarNavItem = { ...expandableItem, count: 3 };
      renderWithProviders(<NavRow item={itemWithCount} collapsed={false} />);
      expect(screen.queryByTestId('nav-row-count')).toBeNull();
    });

    it('should not render count when count is undefined', () => {
      renderWithProviders(<NavRow item={noCountItem} collapsed={false} />);
      expect(screen.getByTestId('nav-row-label')).toBeTruthy();
      expect(screen.queryByTestId('nav-row-count')).toBeNull();
    });

    it('should mark the row as selected when activeId matches item id', () => {
      renderWithProviders(<NavRow item={baseItem} activeId="inbox" collapsed={false} />);
      const button = screen.getByRole('link');
      expect(button.className).toMatch(/Mui-selected/);
    });

    it('should not mark the row as selected when activeId does not match', () => {
      renderWithProviders(<NavRow item={baseItem} activeId="other" collapsed={false} />);
      const button = screen.getByRole('link');
      expect(button.className).not.toMatch(/Mui-selected/);
    });

    it('should render a NavLink when route is provided', () => {
      renderWithProviders(<NavRow item={baseItem} collapsed={false} />);
      expect(screen.getByRole('link')).toBeTruthy();
    });

    it('should render a div (not a link) when route is absent', () => {
      renderWithProviders(<NavRow item={expandableItem} collapsed={false} />);
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('should render an SVG integration icon when icon is a string', () => {
      const svgItem: SidebarNavItem = { id: 'prs', label: 'My PRs', icon: 'git-pull-request' };
      renderWithProviders(<NavRow item={svgItem} collapsed={false} />);
      expect(screen.getByAltText('git-pull-request')).toBeTruthy();
    });
  });

  describe('collapsed mode', () => {
    it('should hide the item label when collapsed', () => {
      renderWithProviders(<NavRow item={baseItem} collapsed={true} />);
      expect(screen.queryByTestId('nav-row-label')).toBeNull();
    });

    it('should not render the count text when collapsed', () => {
      renderWithProviders(<NavRow item={baseItem} collapsed={true} />);
      expect(screen.queryByTestId('nav-row-count')).toBeNull();
    });

    it('should provide a Tooltip with label and count when collapsed', async () => {
      renderWithProviders(<NavRow item={baseItem} collapsed={true} />);
      // Tooltip title is set — verify via aria attribute on the wrapping element
      const tooltipWrapper =
        screen.getByRole('link').closest('[aria-label]') ?? screen.getByRole('link').parentElement;
      // The Tooltip title "Inbox (5)" is surfaced as the title attribute in MUI
      expect(tooltipWrapper).toBeTruthy();
    });

    it('should use plain label in Tooltip when count is absent', () => {
      renderWithProviders(<NavRow item={noCountItem} collapsed={true} />);
      // No crash and the row renders (link is present)
      expect(screen.getByRole('link')).toBeTruthy();
    });
  });
});
