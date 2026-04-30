importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: 'mari-solat.firebaseapp.com',
  projectId: 'mari-solat',
  storageBucket: 'mari-solat.firebasestorage.app',
  messagingSenderId: '140213746226',
  appId: '1:140213746226:web:5f4f319b2ce6818b5d5a2b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title ?? 'MariSolat';
  const body = payload.notification?.body ?? '';
  const tag = payload.data?.tag ?? 'marisolat';

  self.registration.showNotification(title, {
    body,
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    tag,
  });
});
