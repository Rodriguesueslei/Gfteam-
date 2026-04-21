import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Master App Initialization
const masterApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(masterApp);
export const db = getFirestore(masterApp, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Helper to create a tenant instance
export const createTenantInstance = (config: any) => {
  const appName = `tenant-${config.projectId}`;
  let app: FirebaseApp;
  
  if (getApps().find(a => a.name === appName)) {
    app = getApp(appName);
  } else {
    app = initializeApp(config, appName);
  }

  return {
    auth: getAuth(app),
    db: getFirestore(app)
  };
};
