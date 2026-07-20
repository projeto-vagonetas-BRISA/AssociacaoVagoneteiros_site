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

async function ensureServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers não são suportados neste navegador.');
  }

  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  }

  await navigator.serviceWorker.ready;
  return registration;
}

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

  if (!('Notification' in window)) {
    throw new Error('Notificações do navegador não são suportadas.');
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permissão para notificações negada.');
    }
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Permissão para notificações negada.');
  }

  const registration = await ensureServiceWorkerRegistration();

  return await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
}

export function onFirebaseMessage(handler: (payload: any) => void) {
  if (!messaging) return () => undefined;

  return onMessage(messaging, (payload) => {
    console.log('[FCM] foreground message received', payload);
    handler(payload);

    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Lembrete de passeio', {
        body: payload.notification?.body || 'Seu passeio está próximo.',
        icon: '/favicon.svg',
        tag: 'vagoneteiros-reminder',
      });
    }
  });
}
