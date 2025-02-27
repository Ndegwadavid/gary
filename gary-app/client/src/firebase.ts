// client/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
//import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
//export const analytics = getAnalytics(app);

// Emulator connection disabled for live Firebase Auth
// if (process.env.NODE_ENV === 'development') {
//   const emulatorHost = window.location.hostname === 'localhost' ? 'localhost' : '192.168.1.59';
//   console.log(`Connecting to Auth Emulator at http://${emulatorHost}:9099`);
//   connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
//   console.log(`Connecting to Firestore Emulator at http://${emulatorHost}:8080`);
//   connectFirestoreEmulator(db, emulatorHost, 8080);
// }