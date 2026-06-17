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
import useUserStore from '@shared/store/user.store.ts';
import NavRow from './NavRow.tsx';
import SectionLabel from './SectionLabel.tsx';
import { useLocation } from 'react-router-dom';

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
  const { pathname } = useLocation();
  const collapsed = useUserStore((state) => state.profile.sideBarCollapsed) ?? false;
  const { toggleSideBar } = useUserStore();

  const activeId = useMemo(() => pathname.split('/').filter(Boolean)[0] ?? '', [pathname]);

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
        {CORE_FOCUS_ITEMS.map((item) => (
          <NavRow key={item.id} item={item} activeId={activeId} collapsed={collapsed} />
        ))}
        {INTEGRATION_FOCUS_ITEMS.map((item) => (
          <NavRow key={item.id} item={item} activeId={activeId} collapsed={collapsed} />
        ))}
        {BOTTOM_FOCUS_ITEMS.map((item) => (
          <NavRow key={item.id} item={item} activeId={activeId} collapsed={collapsed} />
        ))}
      </List>

      <Divider sx={{ marginY: 1 }} />

      <SectionLabel label="Filters" collapsed={collapsed} />
      <List disablePadding dense>
        {FILTER_ITEMS.map((item) => (
          <NavRow key={item.id} item={item} collapsed={collapsed} />
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
