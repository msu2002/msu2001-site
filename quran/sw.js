/* This service worker controls ONLY its own directory. External audio/tafsir are not cached here. */
const SCOPE = new URL(self.registration.scope);
const CACHE =
  "quran-tool-" + SCOPE.pathname.replace(/[^a-z0-9]/gi, "_") + "-v1.1.1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/home.js",
  "./js/core.js",
  "./js/audio.js",
  "./js/quran.js",
  "./js/worship.js",
  "./js/settings.js",
  "./js/reciters.js",
  "./js/reciter-picker.js",
  "./js/meanings.js",
  "./data/meanings.json",
  "./vendor/adhan.js",
  "./data/quran.json",
  "./data/adhkar.json",
  "./data/tafsir-source.json",
  "./fonts/ui-regular.woff2",
  "./fonts/ui-bold.woff2",
  "./fonts/AmiriQuran.ttf",
  "./fonts/Amiri-Regular.ttf",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
].map(path => new URL(path, SCOPE).href);
async function prepare() {
  const cache = await caches.open(CACHE);
  await Promise.all(SHELL.map(async u => { const r = await fetch(u, { cache: "reload" }); if (!r.ok) throw new Error(u); await cache.put(u, r); }));
  return { ok: true, files: SHELL.length, available: true };
}
self.addEventListener("install", event => {
  event.waitUntil(prepare().then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("quran-tool-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("message", event => {
  if (event.data?.type === "PREPARE_OFFLINE")
    event.waitUntil(
      prepare()
        .then(result => event.ports[0]?.postMessage(result))
        .catch(error =>
          event.ports[0]?.postMessage({
            ok: false,
            error: "لم تكتمل ملفات الحفظ: " + error.message,
          })
        )
    );
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== SCOPE.origin ||
    !url.pathname.startsWith(SCOPE.pathname)
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await (
            await caches.open(CACHE)
          ).match(new URL("./index.html", SCOPE).href)) || Response.error()
      )
    );
    return;
  }
  if (!SHELL.includes(url.href)) return;
  // Network-first so updates appear immediately; the cache keeps the tool usable offline.
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      try {
        const response = await fetch(request, { cache: "no-cache" });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (e) {
        const saved = await cache.match(request);
        if (saved) return saved;
        throw e;
      }
    })
  );
});
