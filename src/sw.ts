/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// __WB_MANIFEST is injected at build time with the hashed asset list.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API reads: network-first so data is fresh online, but the last successful
// response is served when the connection drops (read-only offline instead of
// a blank app). Writes (non-GET) are not matched and fail normally.
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
  }),
);

// SPA app-shell: serve the precached index.html for navigations so a cold
// launch still renders while offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---- Push notifications ----

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || { title: 'GPGA', body: 'New notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      const origin = self.location.origin;
      const existing = windowClients.find((c) => c.url.includes(origin));
      if (existing) {
        (existing as WindowClient).focus();
        return;
      }
      return self.clients.openWindow((event.notification.data as string) || '/');
    })
  );
});
