/* JuraganKos OS — Service Worker
 * - Aset statis: stale-while-revalidate (terbuka instan, diperbarui di latar)
 * - Permintaan ke Google Apps Script: SELALU jaringan (data tidak pernah dari cache SW)
 * - Naikkan VERSI setiap rilis agar cache lama dibersihkan
 */
const VERSI = 'jk-1.0.0';
const INTI = ['./', './index.html', './app.html', './verifikasi.html', './manifest.json',
  './css/style.css?v=1.0.0', './css/landing.css?v=1.0.0', './css/app.css?v=1.0.0',
  './js/config.js?v=1.0.0', './js/core.js?v=1.0.0', './js/landing.js?v=1.0.0', './js/app.js?v=1.0.0', './js/charts.js?v=1.0.0', './js/ekspor.js?v=1.0.0',
  './js/v-staf.js?v=1.0.0', './js/v-staf2.js?v=1.0.0', './js/v-penghuni.js?v=1.0.0',
  './assets/icons/logo.svg', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/favicon-64.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => Promise.all(INTI.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/script\.google(usercontent)?\.com|accounts\.google\.com|googleapis\.com|gstatic\.com\/recaptcha/.test(url.hostname)) return; // data & login: jaringan saja
  if (url.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) return;
  e.respondWith(caches.open(VERSI).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const jaringan = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit || (req.mode === 'navigate' ? c.match('./app.html') : undefined));
    return hit || jaringan;
  }));
});
