import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import { Outlet } from 'react-router-dom';
import AppHeader from './header/AppHeader.tsx';
import AppSidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from './sidebar/AppSidebar.tsx';
import MobileBottomNav from '@app/layout/mobilebar/MobileBottomNav.tsx';
import Footer from '@app/common/footer/Footer.tsx';
import useSettingsStore from '@feature/settings/store/settings.store';
import NoteFormModal from '@feature/notes/components/NoteFormModal';
import { useGlobalShortcuts } from '@shared/hooks/useGlobalShortcuts.ts';
import { useLeaderKey } from '@shared/hooks/useLeaderKey.ts';
import { useInboxHeartbeat } from '@feature/inbox/hooks/useInboxHeartBeat.ts';

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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
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
          <AppSidebar />
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
            transition: TRANSITION,
          }}
        >
          <Box
            sx={{ flex: 1, overflowY: 'auto', padding: 3, paddingBottom: { xs: '56px', md: 3 } }}
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
