import { useUserRepos, useUserTeams } from '@feature/inbox/hooks/useInboxQuery.tsx';

/** Result of a lazily loaded list of group entries. */
export interface NavGroupEntries {
  /** Entry values (e.g. scope names); undefined until loaded. */
  data?: readonly string[];
  isLoading: boolean;
}

/** Hook contract for a group data source. `enabled` defers the request until the group is first opened. */
export type NavGroupSource = (enabled: boolean) => NavGroupEntries;

const useNoEntries: NavGroupSource = () => ({ data: [], isLoading: false });

/**
 * Data source per expandable nav item id. To make another nav item expandable,
 * mark it `expandable` in navConfig and register its source here.
 * Each source is a hook, so the mapping must stay static (never built at render time).
 */
export const NAV_GROUP_SOURCES: Readonly<Record<string, NavGroupSource>> = {
  teams: useUserTeams,
  repositories: useUserRepos,
};

export const getNavGroupSource = (itemId: string): NavGroupSource =>
  NAV_GROUP_SOURCES[itemId] ?? useNoEntries;
