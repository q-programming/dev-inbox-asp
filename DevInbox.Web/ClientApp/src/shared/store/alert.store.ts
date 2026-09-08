import type { SyncNotificationItemDto } from '@api';
import { create } from 'zustand';

/** Extra payload carried by an inbox-item alert, rendered via the `inboxItem` notistack variant. */
export interface AlertMessage {
  id?: number;
  type: AlertType;
  message: string;
  inboxItem?: SyncNotificationItemDto;
}

export enum AlertType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
}

type AlertState = {
  alerts: AlertMessage[];
};

type AlertActions = {
  /** Add an alert and schedule its automatic removal based on its type. */
  addAlert: (alert: AlertMessage) => void;
  /** Immediately remove an alert by id. */
  removeAlert: (id?: number) => void;
};

let nextId = 0;

const useAlertStore = create<AlertState & AlertActions>((set) => ({
  alerts: [],

  addAlert: (alert) => {
    const id = ++nextId;
    set((state) => ({ alerts: [...state.alerts, { ...alert, id }] }));
  },

  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
}));

export default useAlertStore;
