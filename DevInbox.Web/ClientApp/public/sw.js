// Dev Inbox background sync worker.
//
// Deliberately NOT a PWA service worker — no manifest, no offline caching, no install prompt.
// Its only job: on a "SYNC_TICK" message from the app (posted on an interval derived from the
// user's configured sync interval), trigger a Background sync and either:
//   - hand the result back to a focused tab (via postMessage) so it can show an in-app alert, or
//   - show a browser notification if no tab is focused and the user opted in.
//
// Note: browsers may terminate an idle service worker after a period of inactivity, so this only
// reliably fires while at least one Dev Inbox tab remains open (even if unfocused/minimized) — it
// is not a substitute for the (Chromium-only, install-gated) Periodic Background Sync API.

const SYNC_ENDPOINT = '/api/sync/trigger';

/** Human-readable labels for the generated `ItemSource` enum values — mirrors useBackgroundSync.ts. */
const INTEGRATION_LABELS = {
  Github: 'GitHub',
  Ado: 'Azure DevOps',
  Note: 'Note',
};

/** Formats a single changed item to match the in-app alert structure: "New: Title (GitHub)". */
function formatItem(item) {
  const kind = item.changeKind === 'New' ? 'New' : 'Updated';
  const integration = INTEGRATION_LABELS[item.integration] ?? item.integration;
  return `${kind}: #${item.externalId} ${item.title} (${integration})`;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SYNC_TICK') {
    return;
  }

  event.waitUntil(runBackgroundSync(Boolean(event.data.sendNotifications)));
});

async function runBackgroundSync(sendNotifications) {
  let result;
  try {
    const response = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify('Background'),
    });
    if (!response.ok) {
      return;
    }
    result = await response.json();
  } catch {
    // Offline, server unreachable, etc. — silently skip this tick, the next one will retry.
    return;
  }

  const items = result?.items ?? [];
  if (items.length === 0) {
    return;
  }

  const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const focusedClient = windowClients.find((client) => client.focused);

  if (focusedClient) {
    // A tab is focused — let the app show an in-app alert instead of a browser notification.
    focusedClient.postMessage({ type: 'SYNC_RESULT', items });
    return;
  }

  if (sendNotifications && self.Notification?.permission === 'granted') {
    await showSyncNotification(items);
  }
}

async function showSyncNotification(items) {
  const newCount = items.filter((item) => item.changeKind === 'New').length;
  const updatedCount = items.length - newCount;

  const summary = [
    newCount > 0 ? `${newCount} new` : null,
    updatedCount > 0 ? `${updatedCount} updated` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const lines = items.slice(0, 3).map(formatItem);
  const body =
    items.length > 3 ? `${lines.join('\n')}\n+${items.length - 3} more` : lines.join('\n');

  await self.registration.showNotification('Dev Inbox', {
    body,
    tag: 'devinbox-sync',
    renotify: true,
    data: { summary },
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients[0];
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
