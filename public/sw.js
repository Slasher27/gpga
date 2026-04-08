const CACHE_NAME = 'gpga-v1';
const SHELL_ASSETS = ['/', '/index.html'];

// Install — cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return; // skip API calls
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Push — show notification
self.addEventListener('push', (e) => {
  const data = e.data?.json() || { title: 'GPGA', body: 'New notification' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: data.url || '/',
    })
  );
});

// Notification click — open app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return; }
      return clients.openWindow(e.notification.data || '/');
    })
  );
});
