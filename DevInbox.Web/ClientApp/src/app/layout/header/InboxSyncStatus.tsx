import { SyncStatus, TriggerType } from '@api';
import { useSyncMutation } from '@feature/inbox/hooks/useInboxQuery';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { useEffect, useState } from 'react';

import SyncIcon from '@mui/icons-material/Sync';
import { Box, IconButton, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import useAlertStore, { AlertType } from '@shared/store/alert.store';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

/** How often the displayed "Synced N ago" text re-renders to reflect elapsed time. */
const SYNC_TIME_REFRESH_MS = 60_000;

const formatSyncTime = (
  completedAt?: Date,
  now: number = Date.now(),
): string => {
  if (!completedAt) {
    return 'Never synced';
  }

  const diffMs =
    now -
    new Date(completedAt).getTime();

  const diffMinutes =
    Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'Synced just now';
  }

  if (diffMinutes < 60) {
    return `Synced ${diffMinutes} min ago`;
  }

  const diffHours =
    Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Synced ${diffHours}h ago`;
  }

  const diffDays =
    Math.floor(diffHours / 24);

  return `Synced ${diffDays} day${
    diffDays > 1 ? 's' : ''
  } ago`;
};

export const InboxSyncStatus = () => {
  const syncMutation = useSyncMutation();
  const { status } = useInboxStore();
  const { addAlert } = useAlertStore();
  const isSyncRunning = useInboxStore(
    (state) => state.status?.syncStatus === SyncStatus.Running
  );

  // The store only updates on an actual heartbeat/sync event, so without this the "Synced N min
  // ago" text would freeze at whatever it read on the last store update (e.g. stuck forever on
  // "Synced just now") even though real time keeps passing between those updates. Re-render every
  // minute purely to recompute the relative text against the current time.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), SYNC_TIME_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);
    

  return (
    <Box
      sx={{
        display: {
          xs: 'none',
          md: 'flex',
        },
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        aria-label="sync"
        data-testid="inbox-sync-button"
        disabled={isSyncRunning}
        onClick={() => {
          addAlert({
            type: AlertType.INFO,
            message:
              'Triggering manual sync...',
          });
          syncMutation.mutate(TriggerType.Manual);
        }}
      >
        <SyncIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',

            animation: isSyncRunning
              ? `${spin} 1s linear infinite`
              : 'none',
          }}
        />
      </IconButton>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          whiteSpace: 'nowrap',
        }}
      >
        {isSyncRunning
          ? 'Sync ongoing'
          : formatSyncTime(
              status?.lastSyncCompletedAt,
              now,
            )}
      </Typography>
    </Box>
  );
};