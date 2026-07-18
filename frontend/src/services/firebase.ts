import { type FirebaseApp, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isFirebaseConfigValid() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    vapidKey
  );
}

if (isFirebaseConfigValid()) {
  firebaseApp = initializeApp(firebaseConfig);
  messaging = getMessaging(firebaseApp);
} else {
  console.warn('Firebase config incomplete. Push notifications are disabled.');
}

export async function getFcmToken(): Promise<string> {
  if (!messaging) {
    throw new Error('Firebase Messaging não está configurado.');
  }

  return await getToken(messaging, { vapidKey });
}

export function onFirebaseMessage(handler: (payload: any) => void) {
  if (!messaging) return () => undefined;
  return onMessage(messaging, handler);
}
