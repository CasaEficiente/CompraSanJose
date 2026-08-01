/* Service worker — cachea el "cascaron" de la app para uso offline.
   Los datos (backend Apps Script y login de Google) NO se cachean. */
const CACHE = 'csj-v14';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Solo servimos desde cache los recursos propios (mismo origen). El resto (Google) va a red.
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  // Red primero: siempre intenta lo ultimo; usa cache solo si estas sin conexion.
  e.respondWith(
    fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
