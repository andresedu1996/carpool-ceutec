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
  const firebaseParams = new URLSearchParams();
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) {
      firebaseParams.append(key, value);
    }
  });

  const swUrl = firebaseParams.size
    ? `/firebase-messaging-sw.js?${firebaseParams.toString()}`
    : "/firebase-messaging-sw.js";

  navigator.serviceWorker
    .register(swUrl)
    .catch((err) =>
      console.error("No se pudo registrar el service worker de FCM", err)
    );
}
