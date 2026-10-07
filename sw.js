/* STI by AE — service worker L'Atelier
   But : (1) rendre le site installable (PWA), (2) fonctionner hors-ligne
   avec la dernière version visitée. Stratégie « réseau d'abord » pour les
   pages (toujours frais quand il y a du réseau), cache pour les ressources
   statiques. Vider le cache en cas de pépin : DevTools → Application. */

var CACHE = "sti-atelier-v17";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/atelier.css",
  "./assets/css/atelier-pages.css",
  "./assets/css/protection.css",
  "./assets/js/protection.js",
  "./assets/fonts/fonts.css",
  "./assets/icons/sti-icon-192.png",
  "./assets/icons/sti-icon-512.png",
];

self.addEventListener("install", function (evt) {
  evt.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) {
        return c.addAll(SHELL);
      })
      .catch(function () {}) // réseau absent au 1er install : on ne bloque pas
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches
      .keys()
      .then(function (cles) {
        return Promise.all(
          cles
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (evt) {
  var req = evt.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // hors site : ne rien toucher

  /* Pages (navigation) : réseau d'abord, cache en secours hors-ligne */
  if (req.mode === "navigate") {
    evt.respondWith(
      fetch(req)
        .then(function (rep) {
          var copie = rep.clone();
          caches.open(CACHE).then(function (c) {
            c.put(req, copie);
          });
          return rep;
        })
        .catch(function () {
          return (
            caches
              .match(req)
              .then(function (m) {
                return m || caches.match("./index.html");
              })
              .then(function (m) {
                return m || Response.error();
              })
          );
        })
    );
    return;
  }

  /* Scripts et feuilles de style : réseau d'abord (toujours à jour), cache hors-ligne */
  if (/\.(css|js)$/i.test(url.pathname)) {
    evt.respondWith(
      fetch(req)
        .then(function (rep) {
          if (rep && rep.ok) {
            var copie = rep.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copie); });
          }
          return rep;
        })
        .catch(function () {
          return caches.match(req).then(function (m) { return m || Response.error(); });
        })
    );
    return;
  }

  /* Médias et polices : cache d'abord puis réseau */
  if (/\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|mp3|webm)$/i.test(url.pathname)) {
    evt.respondWith(
      caches.match(req).then(function (m) {
        var reseau = fetch(req)
          .then(function (rep) {
            if (rep && rep.ok) {
              var copie = rep.clone();
              caches.open(CACHE).then(function (c) { c.put(req, copie); });
            }
            return rep;
          })
          .catch(function () {
            return m || Response.error();
          });
        return m || reseau;
      })
    );
  }
});
