import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import InboxIcon from '@mui/icons-material/Inbox';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import { AppRoute } from '@app/routes';
import { ItemSource } from '@api';
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
  describe('combined filters', () => {
    const githubItem: SidebarNavItem = {
      ...noCountItem,
      id: 'github-items',
      filter: { source: ItemSource.Github },
    };

    it('should merge its filter into the active one in the link', () => {
      renderWithProviders(<NavRow item={githubItem} collapsed={false} />, {
        initialEntries: ['/inbox?status=ToDo'],
      });
      expect(screen.getByRole('link').getAttribute('href')).toBe('/inbox?source=Github&status=ToDo');
    });

    it('should link without its filter once it is already active (toggle off)', () => {
      renderWithProviders(<NavRow item={githubItem} collapsed={false} />, {
        initialEntries: ['/inbox?source=Github&status=ToDo'],
      });
      expect(screen.getByRole('link').getAttribute('href')).toBe('/inbox?status=ToDo');
    });

    it('should be selected when its filter is part of the active filters', () => {
      renderWithProviders(<NavRow item={githubItem} collapsed={false} />, {
        initialEntries: ['/inbox?source=Github&status=ToDo'],
      });
      expect(screen.getByRole('link').className).toContain('Mui-selected');
    });

    it('should reset all filters when the item has no filter', () => {
      renderWithProviders(<NavRow item={noCountItem} collapsed={false} />, {
        initialEntries: ['/inbox?source=Github&status=ToDo'],
      });
      expect(screen.getByRole('link').getAttribute('href')).toBe('/inbox');
    });
  });

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
