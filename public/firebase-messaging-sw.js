/* eslint-disable no-undef */
// Service worker para FCM
try {
  importScripts("/__/firebase/10.12.4/firebase-app-compat.js");
  importScripts("/__/firebase/10.12.4/firebase-messaging-compat.js");
  importScripts("/__/firebase/init.js");
} catch (err) {
  // Permite que el SW siga cargando si no estamos en Firebase Hosting (modo local)
  console.warn("FCM SW: no se pudo cargar init.js desde hosting", err);
  importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");
}

// En local tomamos el senderId de la query string ?senderId=...
const senderId = new URL(self.location).searchParams.get("senderId");
if (firebase?.apps?.length === 0 && senderId) {
  try {
    firebase.initializeApp({ messagingSenderId: senderId });
  } catch (err) {
    console.error("FCM SW: no se pudo inicializar Firebase", err);
  }
}

let messaging = null;
try {
  messaging = firebase.messaging?.();
} catch (err) {
  console.error("FCM SW: error obteniendo messaging", err);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    self.registration.showNotification(title || "Nuevo viaje programado", {
      body: body || "Un pasajero agendó un viaje contigo.",
      icon: "/vite.svg",
      data,
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/panel-conductor";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clis) => {
      const client = clis.find((c) => c.url.includes(url));
      if (client) {
        return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
