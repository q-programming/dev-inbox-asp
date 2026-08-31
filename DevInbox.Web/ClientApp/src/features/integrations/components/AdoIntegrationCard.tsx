import { memo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon.tsx';
import { IntegrationStatus, IntegrationType } from '@api';
import useUserStore from '@shared/store/user.store';
import {
  useAddAdoOrganizationMutation,
  useAdoOrganizationsQuery,
  useConnectIntegrationPatMutation,
  useDisconnectIntegrationMutation,
} from '@feature/integrations/hooks/useIntegrationsMutation';
import ConfirmModal from '@shared/components/confirmModal/ConfirmModal';

const AdoIntegrationCard = memo(() => {
  const integration = useUserStore((state) =>
    state.identity?.integrations?.find((entry) => entry.type === IntegrationType.Ado),
  );
  const isConnected = integration?.status === IntegrationStatus.ACTIVE;
  const isExpired = integration?.status === IntegrationStatus.EXPIRED;

  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isDisconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [newOrganization, setNewOrganization] = useState('');
  const connectPat = useConnectIntegrationPatMutation(IntegrationType.Ado);
  const disconnect = useDisconnectIntegrationMutation(IntegrationType.Ado);
  const organizationsQuery = useAdoOrganizationsQuery(isConnected);
  const addOrganization = useAddAdoOrganizationMutation();

  const handleConnectPat = () => {
    if (!token.trim()) {
      return;
    }
    connectPat.mutate(
      { token: token.trim(), expiresAt: expiresAt ? new Date(expiresAt) : undefined },
      { onSuccess: () => setToken('') },
    );
  };

  const handleAddOrganization = () => {
    if (!newOrganization.trim()) {
      return;
    }
    addOrganization.mutate(newOrganization.trim(), { onSuccess: () => setNewOrganization('') });
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
            Track assigned and mentioned work items from your ADO organization.
          </Typography>
        </Box>
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
          <Chip
            label="Token expired"
            color="warning"
            size="small"
            data-testid="ado-expired-badge"
          />
        )}
      </Stack>

      {(isConnected || isExpired) && (
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={() => setDisconnectConfirmOpen(true)}
          disabled={disconnect.isPending}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="ado-disconnect-btn"
        >
          Disconnect
        </Button>
      )}

      {!isConnected && (
        <Stack spacing={1.5}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Use a Personal Access Token scoped to <code>vso.work</code> (read) and{' '}
            <code>vso.profile</code> (read) to let Dev Inbox track your assigned work items.
          </Typography>
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
            disabled={!token.trim() || connectPat.isPending}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="ado-pat-connect-btn"
          >
            Connect with token
          </Button>
        </Stack>
      )}

      {isConnected && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Organizations</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Automatically discovered from your token, plus any you add manually. Sync fetches work
            items and pull requests across every project in each of these organizations.
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }} data-testid="ado-organizations-list">
            {organizationsQuery.isLoading && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Loading organizations…
              </Typography>
            )}
            {organizationsQuery.data?.length === 0 && !organizationsQuery.isLoading && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                No organizations found yet — add one below, or trigger a sync to auto-discover them.
              </Typography>
            )}
            {organizationsQuery.data?.map((org) => (
              <Chip key={org.name} label={org.name} size="small" data-testid="ado-organization-chip" />
            ))}
          </Stack>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <TextField
              label="Add organization"
              size="small"
              value={newOrganization}
              onChange={(event) => setNewOrganization(event.target.value)}
              placeholder="e.g. contoso"
              data-testid="ado-add-organization-input"
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleAddOrganization}
              disabled={!newOrganization.trim() || addOrganization.isPending}
              data-testid="ado-add-organization-btn"
            >
              Add
            </Button>
          </Stack>
        </Stack>
      )}

      <ConfirmModal
        open={isDisconnectConfirmOpen}
        title="Disconnect Azure DevOps integration?"
        body="This action cannot be undone, and all work items previously synced from Azure DevOps and attached notes will be removed from your inbox."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        loading={disconnect.isPending}
        onConfirm={() => {
          disconnect.mutate();
          setDisconnectConfirmOpen(false);
        }}
        onCancel={() => setDisconnectConfirmOpen(false)}
      />
    </Paper>
  );
});

AdoIntegrationCard.displayName = 'AdoIntegrationCard';
export default AdoIntegrationCard;
