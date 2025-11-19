import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const senderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const swUrl = senderId
    ? `/firebase-messaging-sw.js?senderId=${encodeURIComponent(senderId)}`
    : "/firebase-messaging-sw.js";

  navigator.serviceWorker
    .register(swUrl)
    .catch((err) =>
      console.error("No se pudo registrar el service worker de FCM", err)
    );
}
