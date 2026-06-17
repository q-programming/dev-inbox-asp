import { memo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import PaletteIcon from '@mui/icons-material/Palette';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import ThemeCard from './ThemeCard';
import DensityCard from './DensityCard';
import { DENSITY_LABELS } from '@feature/settings/types/settings.types';
import useUserStore from '@shared/store/user.store';
import {
  DEFAULT_FONT_SIZE,
  Density,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  Theme,
} from '@shared/theme/theme';

const ALL_DENSITIES = [Density.RELAXED, Density.TIGHT, Density.SUPER_TIGHT] as const;

/**
 * Appearance settings section — theme, density, and typography controls.
 * All values are persisted via the user store so they survive page reload.
 */
const AppearanceSection = memo(() => {
  const theme = useUserStore((state) => state.profile.theme);
  const fontSize = useUserStore((state) => state.profile.fontSize ?? DEFAULT_FONT_SIZE);
  const density = useUserStore((state) => state.profile.density ?? Density.RELAXED);
  const { toggleTheme, switchDensity, changeFontSize } = useUserStore();

  const handleThemeSelect = useCallback(
    (mode: Theme) => {
      if (mode !== theme) {
        toggleTheme();
      }
    },
    [theme, toggleTheme],
  );

  const handleFontSizeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      changeFontSize(value as number);
    },
    [changeFontSize],
  );

  const handleDensitySelect = useCallback((den: Density) => switchDensity(den), [switchDensity]);

  return (
    <Box
      id="appearance"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, scrollMarginTop: '72px' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaletteIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography
          variant="h6"
          sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700 }}
        >
          Appearance
        </Typography>
      </Box>
      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Customize how Dev Inbox looks on your device.
        </Typography>
      </Box>

      {/* ── Interface Theme ── */}
      <Paper variant="outlined" sx={{ padding: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DarkModeOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Interface Theme
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <ThemeCard
            mode={Theme.LIGHT}
            selected={theme === Theme.LIGHT}
            onSelect={() => handleThemeSelect(Theme.LIGHT)}
          />
          <ThemeCard
            mode={Theme.DARK}
            selected={theme === Theme.DARK}
            onSelect={() => handleThemeSelect(Theme.DARK)}
          />
        </Box>
      </Paper>

      {/* ── Inbox Density ── */}
      <Paper variant="outlined" sx={{ padding: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewHeadlineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Inbox Density
            </Typography>
          </Box>
          <Chip
            label={`Currently: ${DENSITY_LABELS[density]}`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {ALL_DENSITIES.map((den) => (
            <DensityCard
              key={den}
              density={den}
              selected={den === density}
              onSelect={() => handleDensitySelect(den)}
            />
          ))}
        </Box>
      </Paper>

      {/* ── Typography ── */}
      <Paper variant="outlined" sx={{ padding: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TextFieldsIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Typography
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
          Adjust font sizes and styles for code blocks and UI elements.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Font size slider */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              UI Font Size
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                A
              </Typography>
              <Slider
                value={fontSize}
                onChange={handleFontSizeChange}
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={1}
                size="small"
                sx={{ flex: 1 }}
                aria-label="UI font size"
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}px`}
              />
              <Typography sx={{ fontWeight: 700, fontSize: 18 }}>A</Typography>
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem />
        </Box>
      </Paper>
    </Box>
  );
});

AppearanceSection.displayName = 'AppearanceSection';
export default AppearanceSection;
