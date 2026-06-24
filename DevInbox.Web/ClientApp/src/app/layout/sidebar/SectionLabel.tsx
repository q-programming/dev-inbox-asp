import { memo } from 'react';
import Typography from '@mui/material/Typography';

export interface SectionLabelProps {
  label: string;
  collapsed: boolean;
}

/**
 * Section heading label rendered above nav groups (e.g. "Focus", "Filters").
 * Returns null when the sidebar is collapsed — Tooltips on NavRow provide
 * discoverability in that state.
 */
const SectionLabel = memo(({ label, collapsed }: SectionLabelProps) => {
  if (collapsed) {
    return null;
  }
  return (
    <Typography
      variant="overline"
      color="text.disabled"
      data-testid="section-label"
      sx={{ paddingX: 1, paddingTop: 1.5, paddingBottom: 0.5, display: 'block' }}
    >
      {label}
    </Typography>
  );
});

export default SectionLabel;
