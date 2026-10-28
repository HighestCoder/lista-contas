import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'livro-caixa-fabricio.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'livro-caixa-fabricio',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'livro-caixa-fabricio.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '600534880335',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:600534880335:web:0a644f6ee573ac95359a3a',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('sua_api_key') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('seu-projeto')
);

const configToInit = isFirebaseConfigured
  ? firebaseConfig
  : {
      ...firebaseConfig,
      apiKey: 'AIzaSyDemoPlaceholderKeyForSafeInit00000',
    };

const app = getApps().length === 0 ? initializeApp(configToInit) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
