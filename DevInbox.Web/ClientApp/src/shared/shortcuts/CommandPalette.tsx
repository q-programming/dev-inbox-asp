import { useMemo, useRef, useState, useEffect, type KeyboardEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Density } from '@api';
import useSettingsStore from '@feature/settings/store/settings.store';
import { useShortcutStore } from '@shared/store/shortcut.store';
import { SHORTCUT_ACTIONS } from '@shared/shortcuts/shortcuts.registry';

/** Row vertical padding per density level — same scale InboxItem/NavRow use, just condensed
 * to the one dimension this simple two-line row actually needs. */
const DENSITY_ROW_PADDING: Record<Density, number> = {
  [Density.Relaxed]: 1.25,
  [Density.Tight]: 0.75,
  [Density.SuperTight]: 0.375,
};

/**
 * Ctrl/Cmd + K command palette — lists every shortcut in `SHORTCUT_ACTIONS` (global shortcuts
 * and leader-key navigation alike), searchable by label/description/keys. Selecting one (click
 * or Enter) dispatches its action id through the same `useShortcutStore` dispatch queue the
 * keyboard
 * handlers use, so `useShortcutExecutor` runs it exactly the same way either trigger works.
 *
 * Theme comes for free — this is mounted inside `AppThemeProvider`'s context (see `main.tsx`),
 * same as every other MUI component, so dark/light mode and font size just apply. Row density
 * is read explicitly below since it isn't part of the MUI theme, just app-level row sizing.
 */
const CommandPalette = () => {
  const isOpen = useShortcutStore((state) => state.isPaletteOpen);
  const close = useShortcutStore((state) => state.closePalette);
  const dispatch = useShortcutStore((state) => state.dispatch);
  const density = useSettingsStore((state) => state.density);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return SHORTCUT_ACTIONS;
    }
    return SHORTCUT_ACTIONS.filter((action) =>
      [action.label, action.description, action.keys, action.category].some((field) =>
        field.toLowerCase().includes(normalized),
      ),
    );
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Keep the highlighted row inside the scrollable list — without this, arrowing down past the
  // visible viewport leaves the selection scrolled out of view with nothing visibly highlighted.
  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const runAction = (index: number) => {
    const action = results[index];
    if (!action) {
      return;
    }
    dispatch(action.id);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAction(highlightedIndex);
    }
  };

  return (
    <Dialog
      data-testid="command-palette"
      open={isOpen}
      onClose={close}
      fullWidth
      maxWidth="sm"
      slotProps={{ transition: { onEntered: () => inputRef.current?.focus() } }}
    >
      <Box sx={{ padding: 2 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search actions..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{ htmlInput: { ref: inputRef, 'aria-label': 'Search actions' } }}
        />
      </Box>
      <List sx={{ maxHeight: 400, overflowY: 'auto', pt: 0 }}>
        {results.length === 0 && (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No matching actions
            </Typography>
          </Box>
        )}
        {results.map((action, index) => (
          <ListItemButton
            key={action.id}
            ref={(element: HTMLElement | null) => {
              itemRefs.current[index] = element;
            }}
            selected={index === highlightedIndex}
            onMouseEnter={() => setHighlightedIndex(index)}
            onClick={() => runAction(index)}
            sx={{ py: DENSITY_ROW_PADDING[density] }}
          >
            <ListItemText
              primary={action.label}
              secondary={action.description}
              slotProps={{ secondary: { noWrap: true } }}
            />
            <Chip
              component="code"
              label={action.keys}
              size="small"
              variant="outlined"
              sx={{ fontFamily: 'monospace', ml: 2 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
};

export default CommandPalette;

