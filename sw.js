/* WorldHunt service worker
   HTML is network-first so a re-upload reaches installed apps straight away.
   Icons and fonts stay cache-first. The weather API always goes to the network. */
const VERSION='2026-08-20l';
const CACHE='worldhunt-'+VERSION;
const SHELL=['./','./index.html','./manifest.webmanifest'];   // icons live inside the manifest now

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('message',e=>{ if(e.data==='skipWaiting')self.skipWaiting(); });

self.addEventListener('fetch',e=>{
  const req=e.request, u=new URL(req.url);

  // never touch API calls or anything that is not a simple GET — the old
  // catch-all turned network errors into empty 200s and hid real failures
  if(req.method!=='GET') return;
  if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/.netlify/')) return;   // never cache API calls
  if(u.origin!==location.origin && !u.hostname.endsWith('gstatic.com') && !u.hostname.endsWith('googleapis.com')) return;

  // the app shell: network first, so updates land; cache is the offline fallback
  const isDoc = req.mode==='navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  if(isDoc){
    e.respondWith(
      fetch(req).then(res=>{
        const cp=res.clone(); caches.open(CACHE).then(c=>c.put('./index.html',cp));
        return res;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }
  // everything else: cache first
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{
    if(res&&res.status===200&&(u.origin===location.origin||u.hostname.endsWith('gstatic.com')||u.hostname.endsWith('googleapis.com'))){
      const cp=res.clone(); caches.open(CACHE).then(c=>c.put(req,cp));
    }
    return res;
  }).catch(()=>new Response(''))));
});
