import { memo, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import HubIcon from '@mui/icons-material/Hub';
import IntegrationCard from './IntegrationCard';
import { IntegrationConfig } from '@feature/settings/types/settings.types';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon.tsx';
import { IntegrationStatus, IntegrationType } from '@api';
import useUserStore from '@shared/store/user.store';

const integrationLabels: Record<IntegrationType, string> = {
  [IntegrationType.Github]: 'GitHub',
  [IntegrationType.Ado]: 'Azure DevOps',
};
const integrationDescriptions: Record<IntegrationType, string> = {
  [IntegrationType.Github]: 'Connect your GitHub account to track PRs, reviews, and mentions.',
  [IntegrationType.Ado]: 'Link your ADO organization for work item tracking.',
};

/**
 * Integrations section.
 * The list of integrations is a placeholder for configs that will eventually come from the backend.
 * IntegrationCard is intentionally generic so new integrations can be added without UI changes.
 */
const IntegrationsSection = memo(() => {
  const identity = useUserStore((state) => state.identity);

  const integrations: IntegrationConfig[] = useMemo(
    () =>
      identity?.integrations?.map((integration) => ({
        id: integration.type,
        name: integrationLabels[integration.type],
        description: integrationDescriptions[integration.type],
        icon: <IntegrationIcon integration={integration.type} size={28} />,
        status: integration.status,
        actionLabel: integration.status === IntegrationStatus.Active ? 'Disconnect' : 'Connect',
      })) ?? [],
    [identity],
  );

  return (
    <Box
      id="integrations"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, scrollMarginTop: '72px' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HubIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography
          variant="h6"
          sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700 }}
        >
          Integrations
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {integrations.map((config) => (
          <IntegrationCard key={config.id} config={config} />
        ))}
      </Box>
    </Box>
  );
});

IntegrationsSection.displayName = 'IntegrationsSection';
export default IntegrationsSection;
