import { SyncChangeKind, type SyncNotificationItemDto } from '@api';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { heartbeatKeys } from './useInboxHeartBeat';
import { inboxKeys } from './useInboxQuery';

const SERVICE_WORKER_URL = '/sw.js';

/** Posts a sync tick to the active service worker, asking it to run a sync check. */
const postSyncTick = (sendNotifications: boolean) => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: 'SYNC_TICK', sendNotifications });
    })
    .catch(() => {
      // Service worker isn't ready/available (e.g. registration failed) — skip this tick.
    });
};

/** Human-readable labels for the generated `ItemSource` enum values, used in notification/alert text. */
const INTEGRATION_LABELS: Record<string, string> = {
  Github: 'GitHub',
  Ado: 'Azure DevOps',
  Note: 'Note',
};

/** Max number of individual item alerts shown per sync — the rest are folded into a "+N more" summary. */
const MAX_ITEM_ALERTS = 4;

/** Formats a single changed item the way Outlook-style notifications read: "New: Title (GitHub)". */
const formatItem = (item: SyncNotificationItemDto): string => {
  const kind = item.changeKind === SyncChangeKind.New ? 'New' : 'Updated';
  const integration = INTEGRATION_LABELS[item.integration ?? ''] ?? item.integration;
  return `${kind}: ${item.title} (${integration})`;
};

/**
 * Periodic background sync, driven by a Service Worker so it keeps working while the tab is open
 * but unfocused (e.g. minimized while coding), not just while the app has focus.
 *
 * The main thread only owns scheduling (an interval derived from the user's configured sync
 * interval) and posts a tick to the worker; the worker performs the actual sync call and decides
 * whether to hand results back to a focused tab (in-app alert) or show a browser notification
 * (only if the user opted in via Settings and no tab is currently focused).
 */
export const useBackgroundSync = () => {
  const queryClient = useQueryClient();
  const { addAlert } = useAlertStore();
  const syncIntervalMinutes = useSettingsStore((state) => state.syncIntervalMinutes);
  const sendNotifications = useSettingsStore((state) => state.sendNotifications);
  // Read via a ref inside the message handler/interval so effects don't need to re-run (and
  // re-register listeners) on every render just because these values are captured in a closure.
  const sendNotificationsRef = useRef(sendNotifications);
  sendNotificationsRef.current = sendNotifications;

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let cancelled = false;

    const handleMessage = (event: MessageEvent) => {
      if (cancelled || event.data?.type !== 'SYNC_RESULT') {
        return;
      }

      const items = (event.data.items ?? []) as SyncNotificationItemDto[];
      if (items.length === 0) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      queryClient.invalidateQueries({ queryKey: heartbeatKeys.status });

      // One alert per item (Outlook-style), capped so a big batch doesn't flood the screen.
      items.slice(0, MAX_ITEM_ALERTS).forEach((item) => {
        addAlert({
          type: item.changeKind === SyncChangeKind.New ? AlertType.SUCCESS : AlertType.INFO,
          message: formatItem(item),
          inboxItem: item,
        });
      });

      const remaining = items.length - MAX_ITEM_ALERTS;
      if (remaining > 0) {
        addAlert({ type: AlertType.INFO, message: `+${remaining} more inbox update${remaining > 1 ? 's' : ''}` });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker
      .register(SERVICE_WORKER_URL)
      .then((registration) => {
        // Browsers only auto-recheck a registered worker for byte changes on a fresh navigation,
        // and even then throttle it to ~once/24h — an SPA route change never re-triggers it. Force
        // an explicit check on every mount so a deployed sw.js update (or a local dev change) is
        // picked up promptly instead of silently running a stale, already-cached version.
        void registration.update();
      })
      .catch((err) => console.error('Failed to register the background sync service worker', err));

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [addAlert, queryClient]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const tick = () => postSyncTick(sendNotificationsRef.current);
    const intervalId = window.setInterval(tick, syncIntervalMinutes * 60_000);

    return () => window.clearInterval(intervalId);
  }, [syncIntervalMinutes]);
};
