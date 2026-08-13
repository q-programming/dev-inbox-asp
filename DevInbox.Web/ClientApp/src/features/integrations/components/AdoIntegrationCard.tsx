import { memo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon.tsx';
import { IntegrationType } from '@api';

/**
 * Azure DevOps setup card — placeholder until the ADO integration backend lands.
 * Kept as its own component so wiring it up later doesn't touch onboarding layout.
 */
const AdoIntegrationCard = memo(() => (
  <Paper variant="outlined" sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
      <IntegrationIcon integration={IntegrationType.Ado} size={28} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Azure DevOps
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Track assigned and mentioned work items from your ADO organization.
        </Typography>
      </Box>
      <Chip label="Coming soon" size="small" data-testid="ado-coming-soon-badge" />
    </Stack>
  </Paper>
));

AdoIntegrationCard.displayName = 'AdoIntegrationCard';
export default AdoIntegrationCard;
