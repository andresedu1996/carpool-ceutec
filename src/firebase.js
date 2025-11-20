import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Base de datos
const db = getFirestore(app);

// Autenticacion
const auth = getAuth(app);

// Archivos (Storage)
const storage = getStorage(app);

// Mensajeria (FCM)
let messagingPromise = Promise.resolve(null);
if (typeof window !== "undefined") {
  messagingPromise = isSupported()
    .then((supported) => (supported ? getMessaging(app) : null))
    .catch(() => null);
}

export { db, auth, storage, messagingPromise };
