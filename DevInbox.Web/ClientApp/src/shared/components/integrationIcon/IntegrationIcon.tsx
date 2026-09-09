import { memo } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { IntegrationType } from '@api';

interface IIntegrationIcon {
  integration: IntegrationType | string | undefined;
  size: number;
  /**
   * True when the row hosting this icon is selected/active. The icon is a static
   * SVG rendered via <img>, so it can't inherit `color: primary.contrastText` like
   * a MUI icon does — it needs its own invert filter to turn white against the
   * selected (primary-colored) background in light mode. Dark mode already
   * inverts the icon to white unconditionally, so no extra handling is needed there.
   */
  active?: boolean;
}

const IntegrationIcon = memo(({ integration, size = 16, active = false }: IIntegrationIcon) => {
  const theme = useTheme();
  if(!integration) {
    return null;
  }
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      component="img"
      src={`/${integration}.svg`}
      alt={integration}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: isDark || active ? 'invert(1) brightness(2)' : 'none',
        opacity: isDark || active ? 1 : 0.75,
      }}
    />
  );
});

export default IntegrationIcon;
