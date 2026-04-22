import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Master App Initialization
const initializeMaster = () => {
  if (getApps().length > 0) return getApp();
  
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.error("Master Firebase config is missing apiKey. Check firebase-applet-config.json");
    // Return a dummy app or handle in context? 
    // Actually, if we return null, everything else crashes.
    // Let's create a minimal config check.
    return null;
  }
  
  try {
    return initializeApp(firebaseConfig);
  } catch (err) {
    console.error("Master initialization error:", err);
    return null;
  }
};

const masterApp = initializeMaster();

export const auth = masterApp ? getAuth(masterApp) : { 
  currentUser: null, 
  onAuthStateChanged: () => () => {},
  signOut: async () => {} 
} as unknown as Auth;

export const db = (masterApp && firebaseConfig.firestoreDatabaseId) 
  ? getFirestore(masterApp, firebaseConfig.firestoreDatabaseId) 
  : (masterApp ? getFirestore(masterApp) : {} as unknown as Firestore);

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Helper to create a tenant instance
export const createTenantInstance = (config: any) => {
  // Robust check: if no apiKey, return the master instance to avoid crash
  if (!config || !config.apiKey || !config.projectId) {
    return {
      auth: auth,
      db: db
    };
  }

  const appName = `tenant-${config.projectId}`;
  let app: FirebaseApp;
  
  try {
    if (getApps().find(a => a.name === appName)) {
      app = getApp(appName);
    } else {
      app = initializeApp(config, appName);
    }

    return {
      auth: getAuth(app),
      db: getFirestore(app)
    };
  } catch (err) {
    console.error("Failed to initialize tenant app:", err);
    // Fallback to master to keep app running
    return {
      auth: auth,
      db: db
    };
  }
};
