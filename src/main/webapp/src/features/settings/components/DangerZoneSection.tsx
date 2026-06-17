import { memo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import useAlertStore, { AlertType } from '@shared/store/alert.store.ts';

/**
 * Danger zone section — destructive account actions.
 * Actions are intentionally no-ops until a confirmation flow is implemented.
 */
const DangerZoneSection = memo(() => {
  const { addAlert } = useAlertStore();
  return (
    <Box id="danger-zone" sx={{ scrollMarginTop: '72px' }}>
      <Paper
        variant="outlined"
        sx={{
          padding: 2.5,
          borderColor: 'error.main',
          bgcolor: (theme) => (theme.palette.mode === 'light' ? '#fff5f5' : 'rgba(186,26,26,0.08)'),
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main', mb: 0.5 }}>
          Danger Zone
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Deleting your account will permanently remove all integration data and preferences. This
          action cannot be undone.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="small"
          data-testid="deactivate-btn"
          onClick={() =>
            addAlert({ type: AlertType.WARNING, message: 'Sorry , not implemented yet :(' })
          }
        >
          Deactivate Account
        </Button>
      </Paper>
    </Box>
  );
});

DangerZoneSection.displayName = 'DangerZoneSection';
export default DangerZoneSection;
