import { SyncChangeKind, type SyncNotificationItemDto } from '@api';
import { AlertType, type AlertMessage } from '@shared/store/alert.store';

/** Human-readable labels for the generated `ItemSource` enum values, used in notification/alert text. */
const INTEGRATION_LABELS: Record<string, string> = {
  Github: 'GitHub',
  Ado: 'Azure DevOps',
  Note: 'Note',
};

/** Max number of individual item alerts shown per sync — the rest are folded into a "+N more" summary. */
const MAX_ITEM_ALERTS = 4;

/** Formats a single changed item the way Outlook-style notifications read: "New: Title (GitHub)". */
export const formatSyncItem = (item: SyncNotificationItemDto): string => {
  const kind = item.changeKind === SyncChangeKind.New ? 'New' : 'Updated';
  const integration = INTEGRATION_LABELS[item.integration ?? ''] ?? item.integration;
  return `${kind}: ${item.title} (${integration})`;
};

/**
 * Builds the same Outlook-style alert list for a batch of synced items regardless of trigger
 * source (background tick or manual button) — one alert per item (capped at
 * `MAX_ITEM_ALERTS`), with any remainder folded into a single "+N more" summary alert.
 */
export const buildSyncItemAlerts = (items: SyncNotificationItemDto[]): Omit<AlertMessage, 'id'>[] => {
  const alerts: Omit<AlertMessage, 'id'>[] = items.slice(0, MAX_ITEM_ALERTS).map((item) => ({
    type: item.changeKind === SyncChangeKind.New ? AlertType.SUCCESS : AlertType.INFO,
    message: formatSyncItem(item),
    inboxItem: item,
  }));

  const remaining = items.length - MAX_ITEM_ALERTS;
  if (remaining > 0) {
    alerts.push({ type: AlertType.INFO, message: `+${remaining} more inbox update${remaining > 1 ? 's' : ''}` });
  }

  return alerts;
};
