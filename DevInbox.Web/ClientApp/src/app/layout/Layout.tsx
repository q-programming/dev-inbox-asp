import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './header/AppHeader.tsx';
import AppSidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from './sidebar/AppSidebar.tsx';
import MobileBottomNav from '@app/layout/mobilebar/MobileBottomNav.tsx';
import Footer from '@app/common/footer/Footer.tsx';
import useSettingsStore from '@feature/settings/store/settings.store';
import NoteFormModal from '@feature/notes/components/NoteFormModal';
import { useGlobalShortcuts } from '@shared/hooks/useGlobalShortcuts.ts';
import { useLeaderKey } from '@shared/hooks/useLeaderKey.ts';
import { useInboxHeartbeat } from '@feature/inbox/hooks/useInboxHeartBeat.ts';
import { AppRoute } from '@app/routes.ts';

const TRANSITION = 'width 200ms ease, margin-left 200ms ease';

/**
 * Authenticated app shell.
 * Fixed header at top, collapsible sidebar + scrollable main content, shared footer at bottom.
 * Sidebar width and main margin-left animate in sync via CSS transitions keyed to
 * sideBarCollapsed from the settings store.
 */
const AppLayout = () => {
  useGlobalShortcuts();
  useLeaderKey();
  useInboxHeartbeat()
  const sideBarCollapsed = useSettingsStore((state) => state.sideBarCollapsed);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const sidebarWidth = sideBarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const handleMenuOpen = useCallback(() => setMobileDrawerOpen((prev) => !prev), []);
  const handleDrawerClose = useCallback(() => setMobileDrawerOpen(false), []);

  // The inbox is a Gmail/Slack-style edge-to-edge list + reading pane, so it opts out of the
  // padded "content card" spacing every other page (Settings, Notes, ...) relies on — without
  // this, the list/detail panes would show an unwanted gap and lose width to clip their content.
  const { pathname } = useLocation();
  const isInboxRoute = pathname.startsWith(AppRoute.INBOX);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // A fixed height (not minHeight) is required here: it's what lets the flex row below
        // clip/scroll internally (e.g. the inbox list) instead of growing the whole document,
        // which previously caused the page itself to scroll and lose the fixed reading pane.
        height: '100dvh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <AppHeader onMenuOpen={handleMenuOpen} />
      <Toolbar sx={{ minHeight: { xs: 56 } }} />

      <Box sx={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Drawer
          open={mobileDrawerOpen}
          onClose={handleDrawerClose}
          variant="temporary"
          anchor="left"
          sx={{ display: { xs: 'block', md: 'none' } }}
          slotProps={{ paper: { sx: { width: 280 } } }}
        >
          {/* Push content below the fixed AppBar */}
          <Toolbar sx={{ minHeight: 56 }} />
          <AppSidebar onNavigate={handleDrawerClose} />
        </Drawer>

        {/* Sidebar — fixed, width animates on collapse */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: sidebarWidth,
            flexShrink: 0,
            position: 'fixed',
            top: 56,
            bottom: 0,
            left: 0,
            zIndex: (theme) => theme.zIndex.drawer,
            overflowY: 'auto',
            transition: TRANSITION,
          }}
        >
          <AppSidebar />
        </Box>

        {/* Main content — margin animates in sync with sidebar */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            marginLeft: { xs: 0, md: `${sidebarWidth}px` },
            minHeight: 0,
            // Flex items default to min-width: auto, which lets intrinsic content (e.g. an
            // unbreakable chip label) push this pane wider than the viewport instead of
            // shrinking — that was the real cause of titles/rows clipping without ellipsis
            // after infinite scroll (longer content pushed the whole main pane past 100vw).
            minWidth: 0,
            transition: TRANSITION,
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: isInboxRoute ? 'hidden' : 'auto',
              padding: isInboxRoute ? 0 : 3,
              paddingBottom: isInboxRoute ? { xs: '56px', md: 0 } : { xs: '56px', md: 3 },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* Footer must also offset by sidebar width — sidebar is fixed so it overlays otherwise */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          marginLeft: { xs: 0, md: `${sidebarWidth}px` },
          transition: TRANSITION,
        }}
      >
        <Footer />
      </Box>
      <MobileBottomNav />
      <NoteFormModal />
    </Box>
  );
};

export default AppLayout;
