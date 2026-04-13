/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// __WB_MANIFEST is injected at build time with the hashed asset list.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
