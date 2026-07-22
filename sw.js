const CACHE='oatf-oc-dayof-v09';
const FILES=['./','index.html','style-v09.css','data.js','app-v09.js','manifest.webmanifest'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
