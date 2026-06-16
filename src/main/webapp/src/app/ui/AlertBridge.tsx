import { useEffect, useRef } from 'react';
import useAlertStore, { type AlertMessage, AlertType } from '@shared/store/alert.store.ts';
import { useSnackbar } from 'notistack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

/** Auto-dismiss delay in milliseconds per alert type */
export const ALERT_TIMEOUT_MS: Record<AlertType, number> = {
  [AlertType.INFO]: 3_000,
  [AlertType.SUCCESS]: 3_000,
  [AlertType.WARNING]: 6_000,
  [AlertType.ERROR]: 10_000,
};

/**
 * Side-effect bridge between the alert store and notistack.
 * Watches the store for new alerts and forwards them to notistack's
 * `enqueueSnackbar`. Does not render any visible DOM — returns null.
 *
 * Mount once inside `<SnackbarProvider>` in the app root.
 */
const AlertBridge = () => {
  const { alerts, removeAlert } = useAlertStore();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const shownIds = useRef(new Set<number>());

  useEffect(() => {
    alerts.forEach((alert: AlertMessage) => {
      if (!alert.id || shownIds.current.has(alert.id)) {
        return;
      }

      shownIds.current.add(alert.id);
      enqueueSnackbar(alert.message, {
        variant: alert.type,
        autoHideDuration: ALERT_TIMEOUT_MS[alert.type],
        onClose: () => {
          removeAlert(alert.id);
          shownIds.current.delete(alert.id!);
        },
        action: (snackbarId) => (
          <IconButton
            size="small"
            aria-label="Dismiss notification"
            data-testid={`dismiss-notification-${snackbarId}`}
            color="inherit"
            onClick={() => closeSnackbar(snackbarId)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ),
      });
    });
  }, [alerts, removeAlert, enqueueSnackbar, closeSnackbar]);

  return null;
};

export default AlertBridge;
