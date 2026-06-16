/**
 * Central route registry.
 *
 * - Use `AppRoute` enum wherever you need a path — no magic strings scattered around.
 * - Add routes here first; the enum value becomes the URL path.
 * - `NAV_ITEMS` drives the sidebar. When i18n is added, replace `label` with `t(labelKey)`.
 */

// ─── Route paths ──────────────────────────────────────────────────────────────

export enum AppRoute {
  HOME = '/',
  LOGIN = '/login',
  REGISTER = '/register',
  INBOX = '/inbox',
  SETTINGS = '/settings',
}

// ─── Navigation metadata ──────────────────────────────────────────────────────

export interface NavItem {
  path: AppRoute;
  /** Display label. Replace with `t(labelKey)` when i18n is introduced. */
  label: string;
}

/** Sidebar navigation items for authenticated users. */
export const NAV_ITEMS: NavItem[] = [
  { path: AppRoute.INBOX, label: 'Inbox' },
  { path: AppRoute.SETTINGS, label: 'Settings' },
];
