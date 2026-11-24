import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import NavGroup from './NavGroup.tsx';
import type { SidebarNavItem } from '../navConfig.tsx';

vi.mock('@feature/inbox/hooks/useInboxQuery.tsx', () => ({
  useUserTeams: () => ({ data: ['org/project/team a'], isLoading: false }),
  useUserRepos: () => ({ data: ['org/repo'], isLoading: false }),
}));

const renderGroup = (item: SidebarNavItem, activeId?: string) =>
  renderWithProviders(<NavGroup item={item} activeId={activeId} collapsed={false} />);

describe('NavGroup', () => {
  it('should link team entries to the inbox filtered by team', async () => {
    renderGroup({ id: 'teams', label: 'Teams', icon: null, expandable: true });
    await userEvent.click(screen.getByText('Teams'));

    const link = screen.getByText('team a').closest('a');
    expect(link?.getAttribute('href')).toBe('/inbox?scope=org%2Fproject%2Fteam+a');
  });

  it('should link repository entries to the inbox filtered by scope', async () => {
    renderGroup({ id: 'repositories', label: 'Repositories', icon: null, expandable: true });
    await userEvent.click(screen.getByText('Repositories'));

    const link = screen.getByText('repo').closest('a');
    expect(link?.getAttribute('href')).toBe('/inbox?scope=org%2Frepo');
  });

  it('should mark the entry matching the active scope filter as selected', async () => {
    renderWithProviders(
      <NavGroup
        item={{ id: 'teams', label: 'Teams', icon: null, expandable: true }}
        collapsed={false}
      />,
      { initialEntries: ['/inbox?scope=org%2Fproject%2Fteam+a'] },
    );
    await userEvent.click(screen.getByText('Teams'));

    expect(screen.getByText('team a').closest('a')?.className).toContain('Mui-selected');
  });
});
