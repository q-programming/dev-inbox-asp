import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InboxIcon from '@mui/icons-material/Inbox';
import { Navigate } from 'react-router-dom';
import { AppRoute } from '@app/routes';
import { IntegrationStatus } from '@api';
import useUserStore from '@shared/store/user.store';
import GithubIntegrationCard from '@feature/integrations/components/GithubIntegrationCard';
import AdoIntegrationCard from '@feature/integrations/components/AdoIntegrationCard';

/**
 * First-run onboarding page — shown whenever the authenticated user has no active integrations.
 * Welcomes the user, explains what Dev Inbox does, and walks them through connecting GitHub
 * (PAT or GitHub App) and, eventually, Azure DevOps.
 *
 * `AuthGuard` is what routes users here in the first place; this page mirrors that logic to send
 * users back to /inbox as soon as at least one integration becomes active.
 */
const OnboardingPage = () => {
  const integrations = useUserStore((state) => state.identity?.integrations);
  const firstName = useUserStore((state) => state.firstName);

  const hasActiveIntegration = integrations?.some(
    (integration) => integration.status === IntegrationStatus.ACTIVE,
  );
  if (hasActiveIntegration) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="sm">
        <Stack spacing={4}>
          <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <InboxIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Welcome{firstName ? `, ${firstName}` : ''} 👋
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Dev Inbox aggregates your GitHub pull requests, Azure DevOps work items, and personal
              notes into a single, unified inbox — so nothing you need to act on gets lost across
              tools.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Connect at least one integration below to get started.
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              1. GitHub
            </Typography>
            <GithubIntegrationCard />
          </Stack>

          <Stack spacing={2}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              2. Azure DevOps
            </Typography>
            <AdoIntegrationCard />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default OnboardingPage;
