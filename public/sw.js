// Retire service-worker registrations left by earlier localhost builds.
// No fetch handler or caches: authenticated pages must use the network.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
