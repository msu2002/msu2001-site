/* Only same-origin app/model files are requested. User media stays in IndexedDB. */
const CACHE='fahad-studio-shell-1.4.1';
const FONTS='fahad-studio-fonts-v1';
const MODELS='fahad-studio-models-whisper-base-q8-v1';
const FILES=['./','index.html','style.css?v=1.4.1','core.js?v=1.4.1','captions.js?v=1.4.1','fonts.js?v=1.4.1','fonts/catalog.json','gold.js?v=1.4.1','creative.js?v=1.4.1','app.js?v=1.4.1','asr-worker.js','manifest.webmanifest','assets/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('fahad-studio-shell-')||k.startsWith('fahad-studio-v'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=self.registration.scope;
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const font=url.href.startsWith(new URL('fonts/',scope).href)&&!url.pathname.endsWith('/catalog.json');
 const model=url.href.startsWith(new URL('models/',scope).href)||url.href.startsWith(new URL('vendor/',scope).href);
 event.respondWith((async()=>{
  let cache;
  if(model||font){try{cache=await caches.open(font?FONTS:MODELS);const hit=await cache.match(event.request);if(hit)return hit;}catch{}}
  try{const response=await fetch(event.request);if(response.ok&&(model||font||FILES.some(f=>new URL(f,scope).href===url.href))){const copy=response.clone();event.waitUntil((cache?Promise.resolve(cache):caches.open(CACHE)).then(c=>c.put(event.request,copy)).catch(()=>{}));}return response;}
  catch{const hit=await caches.match(event.request);return hit||Response.error();}
 })());
});
