import { SyncStatus, type InboxStatus, type SyncNotificationItemDto } from '@api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import useAlertStore from '@shared/store/alert.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { buildSyncItemAlerts } from '../utils/syncAlerts';
import { heartbeatKeys } from './useInboxHeartBeat';
import { inboxApi, inboxKeys } from './useInboxQuery';

const SERVICE_WORKER_URL = '/sw.js';

/**
 * Hard floor for the scheduling interval, independent of the settings UI's own min/max slider
 * bounds. A stale/corrupt `syncIntervalMinutes` (e.g. `0` from an old DB row or bad localStorage
 * value predating validation) must never reach `setInterval` as-is — at `0` (or any near-zero
 * value) it fires on every event loop tick, hammering the sync endpoint with thousands of
 * requests until the tab is closed.
 */
const MIN_SYNC_INTERVAL_MINUTES = 1;

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

  // Observes the same cached inbox status the heartbeat hook already fetches/polls — this hook
  // never fetches on its own (`enabled: false`), it just needs `lastSyncCompletedAt`/`syncStatus`
  // to align scheduling with. `queryFn` is only present to satisfy the type signature.
  const { data: inboxStatus } = useQuery<InboxStatus>({
    queryKey: heartbeatKeys.status,
    queryFn: () => inboxApi.getInboxStatus(),
    enabled: false,
  });
  const lastSyncCompletedAt = inboxStatus?.lastSyncCompletedAt;
  const inboxSyncStatus = inboxStatus?.syncStatus;

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

      buildSyncItemAlerts(items).forEach((alert) => addAlert(alert));
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
    const safeIntervalMinutes = Number.isFinite(syncIntervalMinutes)
      ? Math.max(syncIntervalMinutes, MIN_SYNC_INTERVAL_MINUTES)
      : MIN_SYNC_INTERVAL_MINUTES;
    const intervalMs = safeIntervalMinutes * 60_000;

    // Align the first tick with the inbox's actual last completed sync instead of always waiting
    // a full interval from mount/login — otherwise a user who logs in (which already fires its
    // own fire-and-forget Login sync) shortly before a scheduled background check would wait up
    // to 2x the interval before the next one. If we don't yet know when the last sync finished
    // (heartbeat hasn't loaded, or a sync — e.g. the login one — is still `Running`), fall back
    // to the full interval; this also guards against firing a duplicate tick that races the
    // still-in-flight login sync.
    let initialDelayMs = intervalMs;
    if (inboxSyncStatus !== SyncStatus.Running && lastSyncCompletedAt) {
      const elapsedMs = Date.now() - new Date(lastSyncCompletedAt).getTime();
      initialDelayMs = Math.min(Math.max(intervalMs - elapsedMs, 0), intervalMs);
    }

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, intervalMs);
    }, initialDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [syncIntervalMinutes, lastSyncCompletedAt, inboxSyncStatus]);
};
