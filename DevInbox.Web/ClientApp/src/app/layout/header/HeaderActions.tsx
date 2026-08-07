import { AppRoute } from '@app/routes.ts';
import { ItemSource } from '@api';
import { useInboxItemQuery } from '@feature/inbox/hooks/useInboxQuery';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { useNoteModalStore } from '@feature/notes/store/noteModal.store';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import ProfileMenu from '../profile/ProfileMenu.tsx';
import { InboxSyncStatus } from './InboxSyncStatus';

/**
 * Right-hand side of the app header: sync status, settings link, add-note split
 * button, and the profile dropdown.
 * Extracted so AppHeader stays thin and each action group can be tested in isolation.
 */
const HeaderActions = () => {
  const openNoteModal = useNoteModalStore((state) => state.open);
  const { selectedItemId } = useInboxStore();
  const { data: selectedDetails } = useInboxItemQuery(selectedItemId);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  const canAttachToSelectedItem =
    selectedItemId != null &&
    !!selectedDetails &&
    selectedDetails.source !== ItemSource.Note &&
    !selectedDetails.attachedNote;

  const openAddStandaloneNote = () => {
    openNoteModal();
  };

  const openAddAttachedNote = () => {
    if (selectedDetails != null) {
      openNoteModal(selectedDetails);
    }
    setMenuAnchorEl(null);
  };

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
          data-testid="header-add-note-btn"
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openAddStandaloneNote}
          sx={{
            borderRadius: canAttachToSelectedItem ? '4px 0 0 4px' : '4px',
            paddingX: 1.5,
            paddingY: 0.75,
          }}
        >
          Add note
        </Button>
        {canAttachToSelectedItem && (
          <Button
            data-testid="header-add-note-options-btn"
            variant="contained"
            size="small"
            aria-label="add note options"
            onClick={(event) => setMenuAnchorEl(event.currentTarget)}
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
        )}

        <Menu
          data-testid="header-add-note-menu"
          anchorEl={menuAnchorEl}
          open={!!menuAnchorEl}
          onClose={() => setMenuAnchorEl(null)}
        >
          <MenuItem
            data-testid="header-add-note-menu-standalone"
            onClick={() => {
              openAddStandaloneNote();
              setMenuAnchorEl(null);
            }}
          >
            Add standalone note
          </MenuItem>
          <MenuItem data-testid="header-add-note-menu-attached" onClick={openAddAttachedNote}>
            Add note to selected item
          </MenuItem>
        </Menu>
      </Box>

      {/* Profile dropdown */}
      <ProfileMenu />
    </Box>
  );
};

export default HeaderActions;
