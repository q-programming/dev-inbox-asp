import useSettingsStore, {
  SYNC_INTERVAL_MAX_MINUTES,
  SYNC_INTERVAL_MIN_MINUTES,
} from '@feature/settings/store/settings.store';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { memo, useCallback } from 'react';

/**
 * Sync & notifications section — how often the inbox refreshes in the background,
 * and whether the browser is allowed to notify the user when new items arrive.
 */
const SyncSection = memo(() => {
  const syncIntervalMinutes = useSettingsStore((state) => state.syncIntervalMinutes);
  const sendNotifications = useSettingsStore((state) => state.sendNotifications);
  const { changeSyncIntervalMinutes, toggleSendNotifications } = useSettingsStore();

  const handleSyncIntervalChange = useCallback(
    (_event: Event, value: number | number[]) => {
      changeSyncIntervalMinutes(value as number);
    },
    [changeSyncIntervalMinutes],
  );

  return (
    <Box id="sync" sx={{ display: 'flex', flexDirection: 'column', gap: 2, scrollMarginTop: '72px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SyncOutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700 }}>
          Sync & Notifications
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Control how often Dev Inbox refreshes in the background and when it should let you know.
      </Typography>

      {/* ── Sync interval ── */}
      <Paper variant="outlined" sx={{ padding: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <UpdateOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Sync Interval
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Slider
            value={syncIntervalMinutes}
            onChange={handleSyncIntervalChange}
            min={SYNC_INTERVAL_MIN_MINUTES}
            max={SYNC_INTERVAL_MAX_MINUTES}
            step={1}
            size="small"
            sx={{ flex: 1 }}
            aria-label="Sync interval in minutes"
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value} min`}
          />
          <Typography sx={{ fontWeight: 700, minWidth: 64, textAlign: 'right' }} data-testid="sync-interval-value">
            {syncIntervalMinutes} min
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          How often Dev Inbox checks GitHub and Azure DevOps for updates, between {SYNC_INTERVAL_MIN_MINUTES}
          {' '}and {SYNC_INTERVAL_MAX_MINUTES} minutes. Lower values keep the inbox fresher but use more
          background requests.
        </Typography>
      </Paper>

      {/* ── Notifications ── */}
      <Paper variant="outlined" sx={{ padding: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <NotificationsActiveOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={sendNotifications}
              onChange={() => toggleSendNotifications()}
              data-testid="send-notifications-checkbox"
            />
          }
          label="Notify me in the browser when a background sync finds new inbox items"
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          You may be asked to grant browser notification permission the first time this is enabled.
        </Typography>
      </Paper>
    </Box>
  );
});

SyncSection.displayName = 'SyncSection';
export default SyncSection;
