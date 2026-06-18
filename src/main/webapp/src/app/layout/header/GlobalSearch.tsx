import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useRef } from 'react';
import { FOCUS_SEARCH_EVENT } from '@shared/hooks/useGlobalShortcuts.ts';
import { modKey } from '@shared/utils/platform.ts';

/**
 * Global search bar rendered in the header.
 * Hidden on xs breakpoint — only visible on md and above.
 * Ctrl/Cmd+F focuses the input; Escape blurs it.
 */
const GlobalSearch = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusHandler = () => inputRef.current?.focus();
    const escHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    };

    document.addEventListener(FOCUS_SEARCH_EVENT, focusHandler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener(FOCUS_SEARCH_EVENT, focusHandler);
      document.removeEventListener('keydown', escHandler);
    };
  }, []);

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: 360,
        alignItems: 'center',
        gap: 1,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        paddingX: 1.5,
        paddingY: 0.5,
      }}
    >
      <SearchIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
      <InputBase
        placeholder="Search across all streams…"
        inputProps={{ 'aria-label': 'global search', 'data-testid': 'global-search-input' }}
        sx={{ flex: 1, fontSize: '0.875rem' }}
        inputRef={inputRef}
      />
      <Typography
        variant="caption"
        sx={{
          flexShrink: 0,
          fontFamily: '"JetBrains Mono", monospace',
          color: 'text.disabled',
          opacity: 0.5,
        }}
      >
        {modKey}F
      </Typography>
    </Box>
  );
};

export default GlobalSearch;
