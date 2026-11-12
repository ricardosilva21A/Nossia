// Shows push notifications and opens the right page when one is tapped.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Nossia", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Nossia", {
    body: payload.body || "",
    tag: payload.tag,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/hoje" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/hoje";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows[0];
    if (open) {
      // The app is already open: tell it where to go instead of reloading it.
      open.postMessage({ type: "nossia-open", url });
      return open.focus();
    }
    return self.clients.openWindow(url);
  })());
});
