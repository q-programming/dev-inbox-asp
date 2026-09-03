import { memo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon.tsx';
import { IntegrationStatus, IntegrationType } from '@api';
import useUserStore from '@shared/store/user.store';
import {
  useConnectIntegrationPatMutation,
  useDisconnectIntegrationMutation,
} from '@feature/integrations/hooks/useIntegrationsMutation';
import ConfirmModal from '@shared/components/confirmModal/ConfirmModal';

/** GitHub connection mode — mirrors the two auth flows the backend supports. */
enum GithubAuthMode {
  Pat = 'pat',
  OAuthApp = 'oauth',
}

/**
 * GitHub integration setup card for onboarding.
 * Lets the user pick between a Personal Access Token (works with orgs that block GitHub Apps)
 * or the OAuth App flow (one click, auto-refreshing token).
 */
const GithubIntegrationCard = memo(() => {
  const integration = useUserStore((state) =>
    state.identity?.integrations?.find((entry) => entry.type === IntegrationType.Github),
  );
  const isConnected = integration?.status === IntegrationStatus.ACTIVE;
  const isExpired = integration?.status === IntegrationStatus.EXPIRED;

  const [mode, setMode] = useState<GithubAuthMode>(GithubAuthMode.Pat);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isDisconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const connectPat = useConnectIntegrationPatMutation(IntegrationType.Github);
  const disconnect = useDisconnectIntegrationMutation();

  const handleConnectPat = () => {
    if (!token.trim()) {
      return;
    }
    connectPat.mutate(
      { token: token.trim(), expiresAt: expiresAt ? new Date(expiresAt) : undefined },
      { onSuccess: () => setToken('') },
    );
  };

  const handleOAuthConnect = () => {
    // Full-page redirect into the existing GitHub OAuth App flow — the callback
    // redirects back to the app once the token is stored.
    window.location.href = '/api/auth/github';
  };

  return (
    <Paper variant="outlined" sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
        <IntegrationIcon integration={IntegrationType.Github} size={28} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            GitHub
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Track pull requests where you&apos;re the author, a requested reviewer, or mentioned.
          </Typography>
        </Box>
        {isConnected && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Connected"
            color="success"
            size="small"
            data-testid="github-connected-badge"
          />
        )}
        {isExpired && (
          <Chip
            label="Token expired"
            color="warning"
            size="small"
            data-testid="github-expired-badge"
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
          data-testid="github-disconnect-btn"
        >
          Disconnect
        </Button>
      )}

      {!isConnected && (
        <>
          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_event, next: GithubAuthMode | null) => next && setMode(next)}
          >
            <ToggleButton value={GithubAuthMode.Pat} data-testid="github-mode-pat">
              Personal Access Token
            </ToggleButton>
            <ToggleButton value={GithubAuthMode.OAuthApp} data-testid="github-mode-oauth">
              GitHub App
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === GithubAuthMode.Pat ? (
            <Stack spacing={1.5}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Use a PAT if your organization blocks GitHub App installations. Needs{' '}
                <code>repo</code> <code>read:org</code> <code>read:discussion</code> and{' '}
                <code>read:user</code> scopes.
              </Typography>
              <TextField
                label="Personal Access Token"
                type="password"
                size="small"
                fullWidth
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="ghp_…"
                data-testid="github-pat-input"
              />
              <TextField
                label="Expires on (optional)"
                type="date"
                size="small"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ maxWidth: 220 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleConnectPat}
                disabled={!token.trim() || connectPat.isPending}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="github-pat-connect-btn"
              >
                Connect with token
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                One click — Dev Inbox never sees your password and the token refreshes automatically
                on every login.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleOAuthConnect}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="github-oauth-connect-btn"
              >
                Connect with GitHub
              </Button>
            </Stack>
          )}
        </>
      )}
      <ConfirmModal
        open={isDisconnectConfirmOpen}
        title="Disconnect GitHub integration?"
        body="This action cannot be undone, and all pull requests previously synced from GitHub and attached notes will be removed from your inbox."
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

GithubIntegrationCard.displayName = 'GithubIntegrationCard';
export default GithubIntegrationCard;
