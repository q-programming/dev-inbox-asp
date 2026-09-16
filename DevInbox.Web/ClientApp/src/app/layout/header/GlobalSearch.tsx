import { useInboxStore } from '@feature/inbox/store/inbox.store';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { FOCUS_SEARCH_EVENT } from '@shared/shortcuts/shortcuts.constants';
import { modKey } from '@shared/utils/platform.ts';
import { useEffect, useRef, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 500;
/**
 * Global search bar rendered in the header.
 * Hidden on xs breakpoint — only visible on md and above.
 * Ctrl/Cmd+F focuses the input; Escape blurs it.
 * Small debounce on typing not to kill api
 */
const GlobalSearch = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTerm = useInboxStore((state) => state.searchTerm);
  const setSearchTerm = useInboxStore((state) => state.setSearchTerm);
  const [draftSearchTerm, setDraftSearchTerm] = useState<string | undefined>(searchTerm ?? '');

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

  //initial load
  useEffect(() => {
    setDraftSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const normalizedTerm = draftSearchTerm?.trim();
    if (normalizedTerm === searchTerm) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearchTerm(normalizedTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftSearchTerm, searchTerm, setSearchTerm]);

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
        value={draftSearchTerm}
        onChange={(event) => setDraftSearchTerm(event.target.value)}
      />
      {draftSearchTerm && (
        <IconButton
          aria-label="clear search"
          data-testid="clear-search-button"
          size="small"
          onClick={() => {
            setDraftSearchTerm('');
            setSearchTerm('');
          }}
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      )}
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
