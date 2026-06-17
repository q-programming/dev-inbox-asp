import React, { memo, useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import InboxIcon from '@mui/icons-material/Inbox';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppRoute } from '@app/routes.ts';
import ProfileMenuContent from '../profile/ProfileMenuContent.tsx';

const PROFILE_TAB_VALUE = '__profile__';

/**
 * Fixed bottom navigation bar shown on mobile only (xs breakpoint).
 * Profile tab opens ProfileMenuContent anchored above the bar — reusing the
 * same menu component as the desktop header, with no markup duplication.
 */
const MobileBottomNav = memo(() => {
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const profileTabRef = useRef<HTMLButtonElement>(null);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    if (newValue === PROFILE_TAB_VALUE) {
      setMenuAnchor(profileTabRef.current);
    }
  }, []);

  const handleMenuClose = useCallback(() => setMenuAnchor(null), []);

  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <BottomNavigation
        showLabels
        value={pathname}
        onChange={handleTabChange}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <BottomNavigationAction
          component={RouterLink}
          to={AppRoute.INBOX}
          label="Inbox"
          value={AppRoute.INBOX}
          icon={<InboxIcon />}
        />
        <BottomNavigationAction
          component={RouterLink}
          to={AppRoute.NOTES}
          label="Notes"
          value={AppRoute.NOTES}
          icon={<StickyNote2Icon />}
        />
        <BottomNavigationAction
          ref={profileTabRef}
          label="Profile"
          value={PROFILE_TAB_VALUE}
          icon={<AccountCircleIcon />}
          aria-label="open profile menu"
          aria-haspopup="true"
        />
      </BottomNavigation>

      <ProfileMenuContent
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      />
    </Box>
  );
});

export default MobileBottomNav;
