/* FAHAD Video Downloader — service worker (نطاقه /downloader/ فقط) */
var C = 'fvd-v1';
var SHELL = ['./', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.indexOf('/downloader/') !== 0) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res.ok) { var cp = res.clone(); caches.open(C).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r, { ignoreSearch: true }); }));
});
