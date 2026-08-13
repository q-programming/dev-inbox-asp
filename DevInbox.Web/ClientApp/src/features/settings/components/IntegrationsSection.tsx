import { memo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HubIcon from '@mui/icons-material/Hub';
import GithubIntegrationCard from '@feature/integrations/components/GithubIntegrationCard';
import AdoIntegrationCard from '@feature/integrations/components/AdoIntegrationCard';

/**
 * Integrations section.
 * Reuses the same per-integration cards shown during onboarding so connect/disconnect behavior
 * stays identical wherever the user manages integrations.
 */
const IntegrationsSection = memo(() => (
  <Box id="integrations" sx={{ display: 'flex', flexDirection: 'column', gap: 2, scrollMarginTop: '72px' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <HubIcon sx={{ fontSize: 20, color: 'primary.main' }} />
      <Typography variant="h6" sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700 }}>
        Integrations
      </Typography>
    </Box>

    <Stack spacing={1.5}>
      <GithubIntegrationCard />
      <AdoIntegrationCard />
    </Stack>
  </Box>
));

IntegrationsSection.displayName = 'IntegrationsSection';
export default IntegrationsSection;
