import { memo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { IntegrationConfig } from '@feature/settings/types/settings.types';
import { IntegrationStatus } from '@api';

interface IntegrationCardProps {
  config: IntegrationConfig;
  /** Called when the user clicks the action button. No-op until wired in a future iteration. */
  onAction?: () => void;
}

/**
 * Generic integration row card.
 * Accepts status from the backend — active integrations show a badge and a disconnect action,
 * inactive ones show a connect action.
 */
const IntegrationCard = memo(({ config, onAction }: IntegrationCardProps) => {
  const { name, description, icon, status, connectedAs, actionLabel } = config;
  const isActive = status === IntegrationStatus.ACTIVE;

  return (
    <Paper variant="outlined" sx={{ padding: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Brand icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>

      {/* Name + description / connected-as */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        {isActive && connectedAs ? (
          <Typography variant="caption" sx={{ color: 'primary.main' }}>
            Connected as {connectedAs}
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
      </Box>

      {/* Status badge + action */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {isActive && (
          <Chip
            label="ACTIVE"
            size="small"
            data-testid="integration-status-badge"
            sx={{
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.06em',
              padding: 2,
              borderRadius: 2,
            }}
          />
        )}
        <Button
          variant={isActive ? 'outlined' : 'contained'}
          size="small"
          onClick={onAction}
          color={isActive ? 'inherit' : 'primary'}
          data-testid="integration-action-btn"
          sx={{ whiteSpace: 'nowrap' }}
        >
          {actionLabel}
        </Button>
      </Box>
    </Paper>
  );
});

IntegrationCard.displayName = 'IntegrationCard';
export default IntegrationCard;
