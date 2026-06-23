import { memo, type MouseEvent, useCallback, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ProfileMenuContent from './ProfileMenuContent.tsx';

/**
 * Self-contained profile menu for the desktop header.
 * Renders an AccountCircle icon button that opens ProfileMenuContent.
 * memo: anchor state is local so parent re-renders don't cascade here.
 */
const ProfileMenu = memo(() => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const handleOpen = useCallback((ev: MouseEvent<HTMLElement>) => setAnchor(ev.currentTarget), []);
  const handleClose = useCallback(() => setAnchor(null), []);

  return (
    <>
      <Tooltip title="Profile">
        <IconButton
          size="small"
          aria-label="user profile"
          aria-controls={open ? 'profile-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleOpen}
          sx={{ color: 'text.secondary' }}
        >
          <AccountCircleIcon />
        </IconButton>
      </Tooltip>

      <ProfileMenuContent anchorEl={anchor} open={open} onClose={handleClose} />
    </>
  );
});

export default ProfileMenu;
