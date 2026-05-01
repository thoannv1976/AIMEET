import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";

let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (_db) return _db;

  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (json) {
      const creds = JSON.parse(json);
      initializeApp({ credential: cert(creds), projectId: creds.project_id || projectId });
    } else {
      // Use ADC (Google Cloud Run / App Engine sets this automatically)
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }
  _db = getFirestore();
  return _db;
}

export { FieldValue, Timestamp };

// Collections
export const COL = {
  meetings: "meetings",
  tasks: "tasks",
  reports: "reports",
} as const;
