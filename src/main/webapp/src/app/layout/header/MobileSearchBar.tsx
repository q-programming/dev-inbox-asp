import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Mobile-only search trigger + inline search overlay.
 *
 * Collapsed: renders a search icon button that replaces the profile slot in the
 * mobile header.
 * Expanded: the entire toolbar content is replaced by a full-width search input
 * with a close button to dismiss.
 *
 * The `onExpandChange` callback lets the parent (AppHeader) hide/show the other
 * toolbar elements (hamburger, logo) while search is active.
 */

interface MobileSearchBarProps {
  onExpandChange?: (expanded: boolean) => void;
}

const MobileSearchBar = ({ onExpandChange }: MobileSearchBarProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleOpen = useCallback(() => {
    setExpanded(true);
    onExpandChange?.(true);
  }, [onExpandChange]);

  const handleClose = useCallback(() => {
    setExpanded(false);
    onExpandChange?.(false);
  }, [onExpandChange]);

  if (expanded) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          gap: 1,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'primary.main',
          borderRadius: 1,
          paddingX: 1.5,
          paddingY: 0.5,
        }}
      >
        <SearchIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
        <InputBase
          autoFocus
          placeholder="Search across all streams…"
          inputProps={{ 'aria-label': 'mobile search', 'data-testid': 'mobile-search-input' }}
          sx={{ flex: 1, fontSize: '0.875rem' }}
        />
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="close search"
          sx={{ color: 'text.secondary', flexShrink: 0 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <IconButton
      size="small"
      onClick={handleOpen}
      aria-label="open search"
      sx={{ color: 'text.secondary' }}
    >
      <SearchIcon />
    </IconButton>
  );
};

export default MobileSearchBar;
