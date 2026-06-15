import { memo, useCallback } from 'react';
import useAlertStore, { type Alert, AlertType } from '@/shared/store/alert.store';

// ---------------------------------------------------------------------------
// Individual alert item
// ---------------------------------------------------------------------------

interface AlertItemProps {
  alert: Alert;
  onDismiss: (id?: number) => void;
}

const STYLE_BY_TYPE: Record<AlertType, string> = {
  [AlertType.SUCCESS]: 'bg-green-100 border-green-500 text-green-800',
  [AlertType.WARNING]: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  [AlertType.ERROR]: 'bg-red-100 border-red-500 text-red-800',
};

const LABEL_BY_TYPE: Record<AlertType, string> = {
  [AlertType.SUCCESS]: 'Success',
  [AlertType.WARNING]: 'Warning',
  [AlertType.ERROR]: 'Error',
};

const AlertItem = memo(({ alert, onDismiss }: AlertItemProps) => {
  const handleDismiss = useCallback(() => onDismiss(alert.id), [alert.id, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-4 border-l-4 rounded px-4 py-3 shadow ${STYLE_BY_TYPE[alert.type]}`}
    >
      <div>
        <span className="font-semibold mr-1">{LABEL_BY_TYPE[alert.type]}:</span>
        {alert.message}
      </div>
      <button
        aria-label="Dismiss alert"
        onClick={handleDismiss}
        className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
    </div>
  );
});
AlertItem.displayName = 'AlertItem';

/**
 * Renders all active alerts from the alert store.
 * Place this component once in your layout (e.g. in App.tsx or a Shell component).
 */
const Alerts = memo(() => {
  const alerts = useAlertStore((alertState) => alertState.alerts);
  const removeAlert = useAlertStore((alertState) => alertState.removeAlert);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
    >
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={removeAlert} />
      ))}
    </div>
  );
});
Alerts.displayName = 'Alerts';

export default Alerts;
