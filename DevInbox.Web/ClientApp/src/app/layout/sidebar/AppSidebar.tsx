import { memo, useMemo } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import {
  BOTTOM_FOCUS_ITEMS,
  CORE_FOCUS_ITEMS,
  FILTER_ITEMS,
  INTEGRATION_FOCUS_ITEMS,
} from '../navConfig.tsx';
import useSettingsStore from '@feature/settings/store/settings.store';
import NavRow from './NavRow.tsx';
import SectionLabel from './SectionLabel.tsx';
import { useLocation } from 'react-router-dom';
import { useInboxSummaryQuery } from '@feature/inbox/hooks/useInboxQuery.tsx';
import { buildInboxSearch } from '@feature/inbox/utils/inboxFilter';
import type { InboxSummary } from '@api';

export const SIDEBAR_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

// ── Main sidebar ───────────────────────────────────────────────────────────────

/**
 * Left navigation drawer — FOCUS section (inbox, integrations) and FILTERS.
 *
 * Collapsed mode: icon-only, labels/counts hidden, Tooltips provide discoverability.
 * Width transition is handled by the parent Layout so the main content margin
 * animates in sync with the sidebar.
 */
const AppSidebar = memo(() => {
  const location = useLocation();
  const { pathname } = location;
  const collapsed = useSettingsStore((state) => state.sideBarCollapsed);
  const { toggleSideBar } = useSettingsStore();

  const activeId = useMemo(() => {
    // Several nav items share the same /inbox route and are only
    // distinguished by their filter query params — match on both.
    const candidates = [
      ...CORE_FOCUS_ITEMS,
      ...INTEGRATION_FOCUS_ITEMS,
      ...BOTTOM_FOCUS_ITEMS,
      ...FILTER_ITEMS,
    ];
    const match = candidates.find(
      (item) => item.route === pathname && buildInboxSearch(item.filter) === location.search,
    );

    return match?.id ?? pathname.split('/').filter(Boolean)[0] ?? '';
  }, [pathname, location.search]);
  const { data: summary } = useInboxSummaryQuery();

    

  const getCountForItem = (
    id: string,
    summary?: InboxSummary,
  ): number | undefined => {
    if (!summary) {
      return undefined;
    }

    switch (id) {
      case 'inbox':
      case 'todo':
        return summary.toDo;
      case 'reviews':
        return summary.reviewRequests;
      case 'mentions':
        return summary.mentions;
      case 'my-prs':
        return summary.myPullRequests;
      case 'ado-items':
        return summary.adoItems;
      case 'notes':
        return summary.notes;
      case 'saved':
        return summary.saved;
      case 'needs-attention':
        return summary.needsAttention;
      case 'stale':
        return summary.stale;
      default:
        return undefined;
    }
  };

  const focusItems = useMemo(
    () =>
      [
        ...CORE_FOCUS_ITEMS,
        ...INTEGRATION_FOCUS_ITEMS,
        ...BOTTOM_FOCUS_ITEMS,
      ].map(item => ({
        ...item,
        count: getCountForItem(item.id, summary),
      })),
    [summary],
  );
  const filterItems = useMemo(
  () =>
    FILTER_ITEMS.map(item => ({
      ...item,
      count: getCountForItem(item.id, summary),
    })),
  [summary],
);

  return (
    <Box
      component="nav"
      aria-label="main navigation"
      sx={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        paddingX: collapsed ? 0.5 : 1,
        paddingY: 1,
        transition: 'padding 200ms ease',
      }}
    >
      <SectionLabel label="Focus" collapsed={collapsed} />
      <List disablePadding dense>
        {focusItems.map((item) => (
          <NavRow key={item.id} item={item} activeId={activeId} collapsed={collapsed} />
        ))}
      </List>

      <Divider sx={{ marginY: 1 }} />

      <SectionLabel label="Filters" collapsed={collapsed} />
      <List disablePadding dense>
        {filterItems.map((item) => (
          <NavRow key={item.id} item={item} activeId={activeId} collapsed={collapsed} />
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* Collapse toggle */}
      <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
        <IconButton
          onClick={toggleSideBar}
          size="small"
          aria-label={collapsed ? 'expand sidebar' : 'collapse sidebar'}
          sx={{
            alignSelf: collapsed ? 'center' : 'flex-end',
            color: 'text.disabled',
            marginTop: 1,
            '&:hover': { color: 'text.secondary' },
          }}
        >
          {collapsed ? <MenuOpenIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
});

export default AppSidebar;
