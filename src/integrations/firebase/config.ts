/**
 * Firebase — placeholder de configuración.
 *
 * La app actual usa Lovable Cloud (Supabase) como backend principal de auth y BD.
 * Este archivo deja LISTA la conexión a Firebase para cuando quieras usarlo en
 * paralelo (por ejemplo: hosting frontend, FCM, Crashlytics o Analytics).
 *
 * Pasos:
 * 1. Crea un proyecto en https://console.firebase.google.com
 * 2. Añade una app Web y copia los valores en variables de entorno con prefijo VITE_:
 *      VITE_FIREBASE_API_KEY
 *      VITE_FIREBASE_AUTH_DOMAIN
 *      VITE_FIREBASE_PROJECT_ID
 *      VITE_FIREBASE_STORAGE_BUCKET
 *      VITE_FIREBASE_MESSAGING_SENDER_ID
 *      VITE_FIREBASE_APP_ID
 * 3. Instala el SDK: bun add firebase
 * 4. Descomenta el inicializador de abajo.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// import { initializeApp, getApps } from "firebase/app";
// export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
