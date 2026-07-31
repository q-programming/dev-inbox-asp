import { AppRoute } from '@app/routes.ts';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Link as RouterLink } from 'react-router-dom';
import ProfileMenu from '../profile/ProfileMenu.tsx';
import { InboxSyncStatus } from './InboxSyncStatus';

/**
 * Right-hand side of the app header: sync status, settings link, add-note split
 * button, and the profile dropdown.
 * Extracted so AppHeader stays thin and each action group can be tested in isolation.
 */
const HeaderActions = () => {

  return (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, flexShrink: 0 }}>
      {/* Sync status */}
      <InboxSyncStatus />
      {/* Settings */}
      <Tooltip title="Settings">
        <IconButton
          component={RouterLink}
          to={AppRoute.SETTINGS}
          size="small"
          aria-label="settings"
          sx={{ color: 'text.secondary', display: { xs: 'none', md: 'inline-flex' } }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Add note — joined split button (no gap between the two parts) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          sx={{ borderRadius: '4px 0 0 4px', paddingX: 1.5, paddingY: 0.75 }}
        >
          Add note
        </Button>
        <Button
          variant="contained"
          size="small"
          aria-label="add note options"
          sx={{
            borderRadius: '0 4px 4px 0',
            minWidth: 0,
            paddingX: 0.5,
            paddingY: 0.75,
            borderLeft: '1px solid',
            borderColor: 'primary.dark',
          }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </Button>
      </Box>

      {/* Profile dropdown */}
      <ProfileMenu />
    </Box>
  );
};

export default HeaderActions;
