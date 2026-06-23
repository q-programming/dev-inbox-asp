import { memo } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { IntegrationType } from '@api';

interface IIntegrationIcon {
  integration: IntegrationType | string;
  size: number;
}

const IntegrationIcon = memo(({ integration, size = 16 }: IIntegrationIcon) => {
  const theme = useTheme();
  return (
    <Box
      component="img"
      src={`/${integration}.svg`}
      alt={integration}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: theme.palette.mode === 'dark' ? 'invert(1) brightness(2)' : 'none',
        opacity: 0.75,
      }}
    />
  );
});

export default IntegrationIcon;
