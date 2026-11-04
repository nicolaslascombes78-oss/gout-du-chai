// Service worker du Goût du Chai — uniquement pour les notifications.
// Volontairement AUCUN gestionnaire « fetch » : il ne met rien en cache et ne touche
// ni aux pages (/club, /admin, connexion…), ni aux appels Supabase.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Réception d'une notification envoyée par le club
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || "Le Goût du Chai", {
      body: data.body || "",
      icon: "/pwa-icon/192",
      tag: data.tag || undefined, // même tag = la nouvelle remplace l'ancienne
      data: { url: data.url || "/club" },
    })
  );
});

// Toucher la notification ouvre l'appli sur la bonne page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/club", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if (f.url.startsWith(self.location.origin) && "focus" in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
