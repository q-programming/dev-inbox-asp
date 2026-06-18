import { memo, useCallback, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import HeaderLogo from './HeaderLogo.tsx';
import GlobalSearch from './GlobalSearch.tsx';
import HeaderActions from './HeaderActions.tsx';
import MobileSearchBar from './MobileSearchBar.tsx';

/**
 * Top application bar — logo, global search, sync status, actions and profile.
 * Rendered inside a fixed MUI AppBar so page content scrolls beneath it.
 *
 * Mobile behaviour:
 * - Collapsed: hamburger | logo | search icon
 * - Search expanded: full-width search input replaces all other toolbar content
 *
 * Desktop: full search bar in centre, HeaderActions on the right (includes ProfileMenu).
 */
const AppHeader = memo(({ onMenuOpen }: { onMenuOpen?: () => void }) => {
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);

  const handleExpandChange = useCallback((expanded: boolean) => {
    setMobileSearchExpanded(expanded);
  }, []);

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          gap: 2,
          minHeight: { xs: 56 },
          justifyContent: { xs: 'space-between', md: 'flex-start' },
        }}
      >
        {/* Hamburger + logo — hidden on mobile when search is expanded */}
        {!mobileSearchExpanded && (
          <>
            <IconButton
              sx={{ display: { md: 'none' }, color: 'text.secondary', marginRight: 0.5 }}
              onClick={onMenuOpen}
              aria-label="open navigation menu"
            >
              <MenuIcon />
            </IconButton>

            <HeaderLogo />
          </>
        )}

        {/* Spacer — pushes search toward the right on desktop */}
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' } }} />

        {/* Desktop: centred search bar */}
        <GlobalSearch />

        {/* Desktop: right-side actions (sync, settings, add note, profile) */}
        <HeaderActions />

        {/* Mobile: search icon → expands to full-width input */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: mobileSearchExpanded ? 1 : 0 }}>
          <MobileSearchBar onExpandChange={handleExpandChange} />
        </Box>
      </Toolbar>
    </AppBar>
  );
});

export default AppHeader;
