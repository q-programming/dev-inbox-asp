import type { ReactNode } from 'react';
import InboxIcon from '@mui/icons-material/Inbox';
import RateReviewIcon from '@mui/icons-material/RateReview';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GroupIcon from '@mui/icons-material/Group';
import LabelIcon from '@mui/icons-material/Label';
import TuneIcon from '@mui/icons-material/Tune';
import { AppRoute } from '@app/routes';
import { InboxReason, IntegrationType, ItemSource, ItemType } from '@api';
import type { InboxFilter } from '@feature/inbox/utils/inboxFilter';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: ReactNode | IntegrationType;
  /** Route to navigate to. Omit for non-routed items (filters). */
  route?: AppRoute;
  /** Inbox filter criteria applied via query params when navigating to this item. */
  filter?: InboxFilter;
  /** Optional static badge count — will be replaced with live data later. */
  count?: number;
  /** If true the item is a section heading, not clickable. */
  sectionHeader?: boolean;
  /** If true shows a chevron (expandable group, not yet implemented). */
  expandable?: boolean;
}

/**
 * Core navigation items — always present regardless of integrations.
 * "Plugin" features (GitHub, ADO, Jira…) contribute items below via the
 * INTEGRATION_FOCUS_ITEMS array so the core list stays clean.
 */
export const CORE_FOCUS_ITEMS: SidebarNavItem[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    icon: <InboxIcon fontSize="small" />,
    route: AppRoute.INBOX,
  },
  {
    id: 'reviews',
    label: 'Review requests',
    icon: <RateReviewIcon fontSize="small" />,
    route: AppRoute.INBOX,
    filter: { reason: InboxReason.ReviewRequested },
  },
  {
    id: 'mentions',
    label: 'Mentions',
    icon: <AlternateEmailIcon fontSize="small" />,
    route: AppRoute.INBOX,
    filter: { reason: InboxReason.Mentioned },
  },
];

/**
 * Integration-contributed focus items.
 * GitHub and ADO use SVG assets; future integrations (Jira, etc.) extend here.
 * Icons are rendered inline — the consuming component handles theme-aware SVG styling.
 */
export const INTEGRATION_FOCUS_ITEMS: SidebarNavItem[] = [
  {
    id: 'my-prs',
    label: 'My PRs',
    icon: 'git-pull-request',
    route: AppRoute.INBOX,
    filter: { itemType: ItemType.PR, reason: InboxReason.Authored },
  },
  {
    id: 'ado-items',
    label: 'ADO items',
    icon: IntegrationType.Ado,
    route: AppRoute.INBOX,
    filter: { source: ItemSource.Ado },
  },
];

export const BOTTOM_FOCUS_ITEMS: SidebarNavItem[] = [
  {
    id: 'notes',
    label: 'Notes',
    icon: <StickyNote2Icon fontSize="small" />,
    route: AppRoute.INBOX,
    filter: { itemType: ItemType.Note },
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: <BookmarkIcon fontSize="small" />,
    route: AppRoute.INBOX,
  },
];

export const FILTER_ITEMS: SidebarNavItem[] = [
  { id: 'unread', label: 'Unread', icon: <MarkEmailUnreadIcon fontSize="small" /> },
  { id: 'needs-attention', label: 'Needs attention', icon: <ErrorOutlineIcon fontSize="small" /> },
  { id: 'stale', label: 'Stale', icon: <AccessTimeIcon fontSize="small" /> },
  {
    id: 'repositories',
    label: 'Repositories',
    icon: <FolderOpenIcon fontSize="small" />,
    expandable: true,
  },
  { id: 'teams', label: 'Teams', icon: <GroupIcon fontSize="small" />, expandable: true },
  { id: 'labels', label: 'Labels', icon: <LabelIcon fontSize="small" />, expandable: true },
  { id: 'manage-filters', label: 'Manage filters', icon: <TuneIcon fontSize="small" /> },
];
