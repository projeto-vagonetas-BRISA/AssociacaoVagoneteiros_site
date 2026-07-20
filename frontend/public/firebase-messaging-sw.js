importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

// Replace these values with your Firebase app config.
const firebaseConfig = {
  apiKey: 'AIzaSyALzmNdQ-Apm9rH2vcvnceGOlfCBdJZ2lw',
  authDomain: 'vagoneteirosteste.firebaseapp.com',
  projectId: 'vagoneteirosteste',
  messagingSenderId: '535123408737',
  appId: '1:535123408737:web:e6c4f09088c2387dd27720',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || 'Lembrete de passeio';
  const notificationOptions = {
    body: payload.notification?.body || 'Seu passeio está próximo.',
    icon: '/favicon.svg',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
