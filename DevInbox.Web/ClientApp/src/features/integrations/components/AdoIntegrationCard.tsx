import { memo, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon.tsx';
import { IntegrationDto, IntegrationStatus, IntegrationType } from '@api';
import useUserStore from '@shared/store/user.store';
import {
  useConnectIntegrationPatMutation,
  useDisconnectAdoOrganizationMutation,
} from '@feature/integrations/hooks/useIntegrationsMutation';
import ConfirmModal from '@shared/components/confirmModal/ConfirmModal';

/**
 * Renders one connected Azure DevOps organization — its own status badge and disconnect action,
 * mirroring the GitHub card's connected-state layout so the two integrations look consistent.
 */
const AdoOrganizationRow = memo(({ integration }: { integration: IntegrationDto }) => {
  const isConnected = integration.status === IntegrationStatus.ACTIVE;
  const isExpired = integration.status === IntegrationStatus.EXPIRED;
  const [isDisconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const disconnect = useDisconnectAdoOrganizationMutation();

  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', gap: 1.5, py: 0.5 }}
      data-testid="ado-organization-row"
    >
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} data-testid="ado-organization-name">
        {integration.organization}
      </Typography>
      {isConnected && (
        <Chip
          icon={<CheckCircleIcon />}
          label="Connected"
          color="success"
          size="small"
          data-testid="ado-connected-badge"
        />
      )}
      {isExpired && (
        <Chip label="Token expired" color="warning" size="small" data-testid="ado-expired-badge" />
      )}
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={() => setDisconnectConfirmOpen(true)}
        disabled={disconnect.isPending}
        data-testid="ado-disconnect-btn"
      >
        Disconnect
      </Button>
      <ConfirmModal
        open={isDisconnectConfirmOpen}
        title={`Disconnect "${integration.organization}"?`}
        body="This action cannot be undone, and all work items and pull requests previously synced from this organization (and attached notes) will be removed from your inbox. Other connected organizations are not affected."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        loading={disconnect.isPending}
        onConfirm={() => {
          disconnect.mutate(integration.organization!);
          setDisconnectConfirmOpen(false);
        }}
        onCancel={() => setDisconnectConfirmOpen(false)}
      />
    </Stack>
  );
});
AdoOrganizationRow.displayName = 'AdoOrganizationRow';

/**
 * Azure DevOps integration card — unlike GitHub, ADO Personal Access Tokens are scoped to a single
 * organization (Microsoft is deprecating "all accessible organizations" PATs), so a user connects
 * one organization at a time and may end up with several independent connections, each with its
 * own status and disconnect action.
 */
const AdoIntegrationCard = memo(() => {
  const allIntegrations = useUserStore((state) => state.identity?.integrations);
  const integrations = useMemo(
    () => allIntegrations?.filter((entry) => entry.type === IntegrationType.Ado) ?? [],
    [allIntegrations],
  );

  const [organization, setOrganization] = useState('');
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const connectPat = useConnectIntegrationPatMutation(IntegrationType.Ado);

  const handleConnectPat = () => {
    if (!organization.trim() || !token.trim()) {
      return;
    }
    connectPat.mutate(
      { organization: organization.trim(), token: token.trim(), expiresAt: expiresAt ? new Date(expiresAt) : undefined },
      { onSuccess: () => { setOrganization(''); setToken(''); setExpiresAt(''); } },
    );
  };

  return (
    <Paper variant="outlined" sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
        <IntegrationIcon integration={IntegrationType.Ado} size={28} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Azure DevOps
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Track assigned work items and pull requests across one or more Azure DevOps organizations.
          </Typography>
        </Box>
        {integrations.length > 0 && (
          <Chip
            icon={<CheckCircleIcon />}
            label={`${integrations.length} connected`}
            color="success"
            size="small"
            data-testid="ado-connected-badge"
          />
        )}
      </Stack>

      {integrations.length > 0 && (
        <Stack spacing={0.5} data-testid="ado-organizations-list">
          {integrations.map((integration) => (
            <AdoOrganizationRow key={integration.organization} integration={integration} />
          ))}
        </Stack>
      )}

      {integrations.length > 0 && <Divider />}

      <Stack spacing={1.5}>
        <Typography variant="subtitle2">
          {integrations.length > 0 ? 'Connect another organization' : 'Connect an organization'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Azure DevOps Personal Access Tokens are scoped to a single organization — use a PAT scoped
          to <code>vso.work</code> (read), <code>vso.code</code> (read) and <code>vso.project</code>{' '}
          (read) for the organization you want to track.
        </Typography>
        <TextField
          label="Organization"
          size="small"
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          placeholder="e.g. contoso"
          data-testid="ado-organization-input"
        />
        <TextField
          label="Personal Access Token"
          type="password"
          size="small"
          fullWidth
          value={token}
          onChange={(event) => setToken(event.target.value)}
          data-testid="ado-pat-input"
        />
        <TextField
          label="Expires on (optional)"
          type="date"
          size="small"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
          data-testid="ado-pat-expires-on-input"
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleConnectPat}
          disabled={!organization.trim() || !token.trim() || connectPat.isPending}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="ado-pat-connect-btn"
        >
          Connect
        </Button>
      </Stack>
    </Paper>
  );
});

AdoIntegrationCard.displayName = 'AdoIntegrationCard';
export default AdoIntegrationCard;
