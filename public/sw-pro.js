// HOOMY PRO — Service Worker minimal
// Stratégie : réseau-first pour la navigation et l'auth, cache-first pour les assets statiques.
// Pas de cache agressif : l'authentification Supabase doit toujours passer par le réseau.

const VERSION = "hoomy-pro-v1";

// ── Installation ──────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  // Activation immédiate sans attendre la fermeture des anciens onglets
  self.skipWaiting();
});

// ── Activation ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  // Supprime les anciens caches pour éviter les conflits de version
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ne rien intercepter pour les méthodes non-GET
  if (request.method !== "GET") return;

  // Ne jamais intercepter les appels Supabase (auth, DB, storage)
  if (url.hostname.includes("supabase")) return;

  // Ne pas intercepter les routes API Next.js
  if (url.pathname.startsWith("/api/")) return;

  // ── Navigation (pages HTML) : réseau-first ────────────────────────────────
  // L'auth et les redirections middleware doivent toujours passer par le serveur.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            new Response(
              "<!doctype html><html><body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#fff'>" +
              "<div style='text-align:center'><p style='font-size:2rem;color:#D4AF37'>HOOMY PRO</p>" +
              "<p>Vérifiez votre connexion internet.</p></div></body></html>",
              { headers: { "Content-Type": "text/html;charset=utf-8" } }
            )
        )
      )
    );
    return;
  }

  // ── Assets statiques Next.js : cache-first ────────────────────────────────
  // Les bundles JS/CSS de _next/static/ sont versionnés — cache permanent.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Tout le reste : réseau-first avec fallback cache ─────────────────────
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Notifications push ────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.titre ?? "HOOMY PRO", {
      body: data.corps ?? "",
      icon: "/icons/pro-192",
      badge: "/icons/pro-192",
      data: { url: data.url ?? "/pro" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/pro";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      for (const client of liste) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
