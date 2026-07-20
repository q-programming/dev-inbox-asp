import { memo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { THEME_PREVIEW_TOKENS } from '@shared/theme/theme';
import { Theme } from '@api';

interface ThemeCardProps {
  mode: Theme;
  selected: boolean;
  onSelect: () => void;
}

/** Visual preview card for a single colour theme option (Light or Dark). */
const ThemeCard = memo(({ mode, selected, onSelect }: ThemeCardProps) => {
  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      data-testid={`theme-card-${mode}`}
      aria-pressed={selected}
      sx={{
        position: 'relative',
        width: 160,
        padding: 1.5,
        cursor: 'pointer',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'border-color 150ms ease',
        '&:hover': { borderColor: 'primary.light' },
      }}
    >
      {/* Miniature UI preview — always uses its own mode's palette tokens */}
      <Box
        sx={{
          height: 80,
          borderRadius: 1,
          bgcolor: THEME_PREVIEW_TOKENS[mode].bg,
          mb: 1,
          padding: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {/* Fake header bar */}
        <Box
          sx={{
            height: 8,
            bgcolor: THEME_PREVIEW_TOKENS[mode].paper,
            borderRadius: 0.5,
          }}
        />
        {/* Fake content row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: THEME_PREVIEW_TOKENS[mode].primary,
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              height: 6,
              flex: 1,
              bgcolor: THEME_PREVIEW_TOKENS[mode].divider,
              borderRadius: 0.5,
            }}
          />
        </Box>
        <Box
          sx={{
            height: 6,
            width: '70%',
            bgcolor: THEME_PREVIEW_TOKENS[mode].divider,
            borderRadius: 0.5,
          }}
        />
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {mode === Theme.Light ? 'Light Mode' : 'Dark Mode'}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {mode === Theme.Dark ? 'Default high-clarity view' : 'Easy on the eyes at night'}
      </Typography>

      {selected && (
        <CheckCircleIcon
          sx={{ position: 'absolute', top: 8, right: 8, fontSize: 18, color: 'primary.main' }}
        />
      )}
    </Paper>
  );
});

ThemeCard.displayName = 'ThemeCard';
export default ThemeCard;
