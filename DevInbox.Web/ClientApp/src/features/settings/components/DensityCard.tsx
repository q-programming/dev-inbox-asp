import { memo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { DENSITY_DESCRIPTIONS, DENSITY_LABELS } from '@feature/settings/types/settings.types';
import { Density } from '@api';

interface DensityCardProps {
  density: Density;
  selected: boolean;
  onSelect: () => void;
}

/** Row counts per density level — drives the preview mockup height. */
const ROW_COUNTS: Record<Density, number> = {
  [Density.Relaxed]: 2,
  [Density.Tight]: 3,
  [Density.SuperTight]: 5,
};

/** Preview row heights in px per density level. */
const ROW_HEIGHTS: Record<Density, number> = {
  [Density.Relaxed]: 28,
  [Density.Tight]: 20,
  [Density.SuperTight]: 14,
};

/** Miniature inbox-row preview card for one density option. */
const DensityCard = memo(({ density, selected, onSelect }: DensityCardProps) => {
  const rows = Array.from({ length: ROW_COUNTS[density] });
  const rowHeight = ROW_HEIGHTS[density];

  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      data-testid={`density-card-${density}`}
      aria-pressed={selected}
      sx={{
        flex: 1,
        padding: 1.5,
        cursor: 'pointer',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'border-color 150ms ease',
        '&:hover': { borderColor: 'primary.light' },
      }}
    >
      {/* Miniature rows preview */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5, minHeight: 80 }}>
        {rows.map((_row, index) => (
          <Box
            key={index}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, height: rowHeight }}
          >
            <Box
              sx={{
                width: rowHeight * 0.7,
                height: rowHeight * 0.7,
                borderRadius: '50%',
                bgcolor: 'action.disabledBackground',
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Box
                sx={{
                  height: 6,
                  width: '80%',
                  bgcolor: 'action.disabledBackground',
                  borderRadius: 0.5,
                }}
              />
              {density !== Density.SuperTight && (
                <Box sx={{ height: 5, width: '55%', bgcolor: 'action.hover', borderRadius: 0.5 }} />
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {DENSITY_LABELS[density]}
        </Typography>
        {selected ? (
          <RadioButtonCheckedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        )}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {DENSITY_DESCRIPTIONS[density]}
      </Typography>
    </Paper>
  );
});

DensityCard.displayName = 'DensityCard';
export default DensityCard;
