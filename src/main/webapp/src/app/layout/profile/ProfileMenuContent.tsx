import type { MouseEvent } from 'react';
import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HubIcon from '@mui/icons-material/Hub';
import SecurityIcon from '@mui/icons-material/Security';
import PaletteIcon from '@mui/icons-material/Palette';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink } from 'react-router-dom';
import { AppRoute } from '@app/routes.ts';
import useUserStore from '@shared/store/user.store.ts';
import { useLogoutMutation } from '@shared/hooks/useAuthQuery.ts';

export interface ProfileMenuContentProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  /** MUI Menu anchor/transform origin — defaults suit the desktop header. */
  anchorOrigin?: { horizontal: 'left' | 'right' | 'center'; vertical: 'top' | 'bottom' | 'center' };
  transformOrigin?: {
    horizontal: 'left' | 'right' | 'center';
    vertical: 'top' | 'bottom' | 'center';
  };
}

/**
 * The profile dropdown Menu — user info header, navigation links, sign-out.
 *
 * Intentionally props-driven (anchorEl, open, onClose) so it can be triggered
 * from different contexts: the desktop AccountCircle button (ProfileMenu) and
 * the mobile bottom-nav Profile tab (MobileBottomNav) without duplicating markup.
 */
const ProfileMenuContent = ({
  anchorEl,
  open,
  onClose,
  anchorOrigin = { horizontal: 'right', vertical: 'bottom' },
  transformOrigin = { horizontal: 'right', vertical: 'top' },
}: ProfileMenuContentProps) => {
  const { firstName, lastName, identity } = useUserStore();
  const logoutMutation = useLogoutMutation();

  const initials = useMemo(
    () =>
      [firstName, lastName]
        .filter(Boolean)
        .map((name) => name[0].toUpperCase())
        .join('') || '?',
    [firstName, lastName],
  );

  const handleLogout = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      logoutMutation.mutate();
      onClose();
    },
    [logoutMutation, onClose],
  );

  return (
    <Menu
      id="profile-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      onClick={onClose}
      transformOrigin={transformOrigin}
      anchorOrigin={anchorOrigin}
      slotProps={{
        paper: { elevation: 3, sx: { minWidth: 220, mt: 0.5, borderRadius: 1.5 } },
      }}
    >
      {/* User info header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, paddingX: 2, paddingY: 1.5 }}>
        <Avatar
          data-testid="profile-avatar"
          sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.875rem' }}
        >
          {initials}
        </Avatar>
        <Box>
          <Typography
            variant="body2"
            data-testid="profile-name"
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
          >
            {firstName} {lastName}
          </Typography>
          {identity?.email && (
            <Typography variant="caption" color="text.secondary" data-testid="profile-email">
              {identity.email}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider />

      <MenuItem component={RouterLink} to={AppRoute.PROFILE} dense>
        <ListItemIcon>
          <ManageAccountsIcon fontSize="small" />
        </ListItemIcon>
        Profile Settings
      </MenuItem>

      <MenuItem component={RouterLink} to={`${AppRoute.SETTINGS}#integrations`} dense>
        <ListItemIcon>
          <HubIcon fontSize="small" />
        </ListItemIcon>
        Integration Status
      </MenuItem>

      <MenuItem dense disabled>
        <ListItemIcon>
          <SecurityIcon fontSize="small" />
        </ListItemIcon>
        Security
      </MenuItem>

      <MenuItem component={RouterLink} to={`${AppRoute.SETTINGS}#appearance`} dense>
        <ListItemIcon>
          <PaletteIcon fontSize="small" />
        </ListItemIcon>
        Appearance
      </MenuItem>

      <Divider />

      <MenuItem
        dense
        onClick={handleLogout}
        sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
      >
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        Sign out
      </MenuItem>
    </Menu>
  );
};

export default ProfileMenuContent;
