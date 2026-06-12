import { create } from 'zustand';

export interface Alert {
  id?: number;
  type: AlertType;
  message: string;
}

export enum AlertType {
  SUCCESS,
  WARNING,
  ERROR,
}

/** Auto-dismiss delay in milliseconds per alert type */
const ALERT_TIMEOUT_MS: Record<AlertType, number> = {
  [AlertType.SUCCESS]: 3_000,
  [AlertType.WARNING]: 6_000,
  [AlertType.ERROR]: 10_000,
};

type AlertState = {
  alerts: Alert[];
};

type AlertActions = {
  /** Add an alert and schedule its automatic removal based on its type. */
  addAlert: (alert: Alert) => void;
  /** Immediately remove an alert by id. */
  removeAlert: (id?: number) => void;
};

let nextId = 0;

const useAlertStore = create<AlertState & AlertActions>((set) => ({
  alerts: [],

  addAlert: (alert) => {
    const id = ++nextId;
    set((state) => ({ alerts: [...state.alerts, { ...alert, id }] }));
    const delay = ALERT_TIMEOUT_MS[alert.type];
    setTimeout(() => {
      set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) }));
    }, delay);
  },

  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
}));

export default useAlertStore;
