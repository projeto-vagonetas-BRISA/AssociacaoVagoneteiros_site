import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(__dirname, '../../serviceAccountKey.json');

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', error);
  }
} else if (existsSync(serviceAccountPath)) {
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  } catch (error) {
    console.error('Erro ao ler o serviceAccountKey.json:', error);
  }
} else {
  console.warn('Firebase service account key not found. Push notifications will not be sent.');
}

if (!getApps().length) {
  if (!serviceAccount) {
    console.warn('Firebase Admin initialization skipped because no service account is available.');
  } else {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

export const messaging: Messaging | null = getApps().length ? getMessaging() : null;
