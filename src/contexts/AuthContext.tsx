import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, Auth, GoogleAuthProvider, linkWithPopup, unlink, EmailAuthProvider } from 'firebase/auth';
import { auth as masterAuth, db as masterDb, createTenantInstance, logout as firebaseLogout, loginWithEmail as firebaseLoginWithEmail, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where, Firestore } from 'firebase/firestore';

export type UserRole = 'admin' | 'receptionist' | 'professor' | 'user' | 'checkin_tablet' | string;

export interface UserPermissions {
  dashboard: boolean;
  students: boolean;
  finance: boolean;
  inventory: boolean;
  classes: boolean;
  settings: boolean;
  users: boolean;
  checkin: boolean;
  reports: boolean;
  [key: string]: boolean;
}

const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: true, users: true, checkin: true, reports: true
  },
  receptionist: {
    dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: false, users: false, checkin: true, reports: true
  },
  professor: {
    dashboard: true, students: true, finance: false, inventory: false, classes: true, settings: false, users: false, checkin: true, reports: false
  },
  user: {
    dashboard: false, students: false, finance: false, inventory: false, classes: false, settings: false, users: false, checkin: false, reports: false
  },
  checkin_tablet: {
    dashboard: false, students: false, finance: false, inventory: false, classes: false, settings: false, users: false, checkin: true, reports: false
  }
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  permissions: UserPermissions;
  isApproved: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isReceptionist: boolean;
  isProfessor: boolean;
  isCheckInTablet: boolean;
  licenseStatus: 'active' | 'blocked' | 'pending' | 'none';
  gymInfo: {
    name: string;
    slug: string;
    isExternal: boolean;
    config?: any;
  } | null;
  tenantDb: Firestore;
  masterDb: Firestore;
  logout: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  updateTenantConfig: (config: any) => Promise<void>;
  syncGymStats: (stats: { studentCount: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  role: 'user',
  permissions: DEFAULT_PERMISSIONS.user,
  isApproved: false,
  isAdmin: false,
  isSuperAdmin: false,
  isReceptionist: false,
  isProfessor: false,
  isCheckInTablet: false,
  licenseStatus: 'none',
  gymInfo: null,
  tenantDb: masterDb,
  masterDb: masterDb,
  logout: async () => {},
  loginWithEmail: async () => {},
  linkGoogle: async () => {},
  unlinkGoogle: async () => {},
  updateTenantConfig: async () => {},
  syncGymStats: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.user);
  const [isApproved, setIsApproved] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<'active' | 'blocked' | 'pending' | 'none'>('none');
  const [gymInfo, setGymInfo] = useState<{ name: string; slug: string; isExternal: boolean; config?: any; } | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const unsubRoleDocRef = React.useRef<(() => void) | null>(null);
  const unsubLicenseDocRef = React.useRef<(() => void) | null>(null);
  const unsubGymSlugRef = React.useRef<(() => void) | null>(null);

  const [gymSlug, setGymSlug] = useState<string | null>(null);

  // Parse gym slug from URL on init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('gym');
    if (slug) setGymSlug(slug);
  }, []);

  // Fetch Gym Info based on slug or user license
  useEffect(() => {
    let unsub: (() => void) | null = null;
    console.log("AuthContext: Fetching Gym Info. slug:", gymSlug, "user:", user?.email);

    const loadBySlug = async (slug: string) => {
      console.log("AuthContext: Loading by slug:", slug);
      const q = query(collection(masterDb, 'licenses'), where('slug', '==', slug));
      unsub = onSnapshot(q, (snapshot) => {
        console.log("AuthContext: Slug snapshot received. Empty?", snapshot.empty);
        if (!snapshot.empty) {
          const license = snapshot.docs[0].data();
          setGymInfo({
            name: license.academyName || 'Academia',
            slug: license.slug,
            isExternal: true,
            config: license.externalFirebaseConfig
          });
          setLicenseStatus('active');
        } else {
          setGymInfo(null);
          setLicenseStatus('none');
        }
        setLicenseLoading(false);
      }, (err) => {
        console.error("AuthContext: Slug load error:", err);
        setLicenseLoading(false);
      });
    };

    if (gymSlug) {
      setLicenseLoading(true);
      loadBySlug(gymSlug);
    } else if (user && user.email !== "rodrigues.ueslei@gmail.com") {
      setLicenseLoading(true);
      const licenseId = user.email.toLowerCase().trim();
      console.log("AuthContext: User is not super admin, checking license for:", licenseId);
      unsub = onSnapshot(doc(masterDb, 'licenses', licenseId), (docSnap) => {
        console.log("AuthContext: License snapshot received. Exists?", docSnap.exists());
        if (docSnap.exists()) {
          const license = docSnap.data();
          setGymInfo({
            name: license.academyName || 'Academia',
            slug: license.slug || 'setup',
            isExternal: true,
            config: license.externalFirebaseConfig
          });
          setLicenseStatus(license.status || 'active');
        } else {
          setGymInfo(null);
          setLicenseStatus('none');
        }
        setLicenseLoading(false);
      }, (err) => {
        console.error("AuthContext: License load error:", err);
        setLicenseLoading(false);
      });
    } else {
      console.log("AuthContext: No slug and user is super admin or null. clearing gym info.");
      setLicenseLoading(false);
      setGymInfo(null);
      setLicenseStatus('none');
    }

    return () => {
      if (unsub) unsub();
    };
  }, [gymSlug, user]);

  // Dynamic Tenant Instances
  const tenantInstances = useMemo(() => {
    try {
      // Use specific fields for stability
      const configKey = gymInfo?.config?.apiKey;
      const configId = gymInfo?.config?.projectId;
      
      if (configKey && configId) {
        return createTenantInstance(gymInfo.config);
      }
    } catch (err) {
      console.error("Critical Tenant Init Error:", err);
    }
    return { auth: masterAuth, db: masterDb };
  }, [gymInfo?.config?.apiKey, gymInfo?.config?.projectId]); // Stable dependencies

  const tenantDb = tenantInstances.db;

  // Failsafe to ensure app doesn't stay stuck on "Autenticando"
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("AuthContext: Failsafe triggered. Forcing loading=false");
        setLoading(false);
      }
    }, 10000); // 10 seconds max
    return () => clearTimeout(timer);
  }, [loading]);

  // Helper to fetch and set permissions based on role
  const updatePermissions = async (roleName: string, cleanupRef: { current: (() => void) | null }) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (DEFAULT_PERMISSIONS[roleName]) {
      setPermissions(DEFAULT_PERMISSIONS[roleName]);
      return;
    }

    cleanupRef.current = onSnapshot(doc(tenantDb, 'roles', roleName), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPermissions((data.permissions as UserPermissions) || DEFAULT_PERMISSIONS.user);
      } else {
        setPermissions(DEFAULT_PERMISSIONS.user);
      }
    }, (error) => {
      console.error("Error listening to role document:", error);
      setPermissions(DEFAULT_PERMISSIONS.user);
    });
  };

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(masterAuth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setLoading(false);
        setRole('user');
        setPermissions(DEFAULT_PERMISSIONS.user);
        setIsApproved(false);
        setLicenseStatus('none');
        setGymInfo(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Fetch User Profile and Role (Master or Tenant)
  useEffect(() => {
    if (!user) {
      console.log("AuthContext: No user yet in Profile Effect.");
      return;
    }

    let unsubUserDoc: (() => void) | null = null;
    
    // We wait for gymInfo to be resolved (either found by slug or missing) 
    // before determining where to look for the user profile.
    if (licenseLoading) {
      console.log("AuthContext: License is still loading, waiting for Profile Setup.");
      return;
    }

    const setupUserProfile = async () => {
      try {
        const isSuperAdmin = user.email === "rodrigues.ueslei@gmail.com";
        const hasExternalConfig = gymInfo?.config && gymInfo.config.apiKey;
        const targetDb = (hasExternalConfig && !isSuperAdmin) ? tenantDb : masterDb;
        
        console.log("AuthContext: Setting up Profile. targetDb is", (hasExternalConfig && !isSuperAdmin) ? "TENANT" : "MASTER");
        
        const userDocRef = doc(targetDb, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        let currentRole: string = 'user';
        let currentApproved: boolean = false;

        if (!userDoc.exists()) {
          console.log("AuthContext: User profile not found, creating default.");
          currentRole = isSuperAdmin ? 'admin' : 'user';
          currentApproved = isSuperAdmin;
          
          await setDoc(userDocRef, {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: currentRole,
            approved: currentApproved,
            createdAt: serverTimestamp()
          });
        } else {
          const data = userDoc.data();
          console.log("AuthContext: Profile loaded. Role:", data?.role);
          currentRole = data?.role || 'user';
          currentApproved = data?.approved || false;

          if (isSuperAdmin && (currentRole !== 'admin' || !currentApproved)) {
            currentRole = 'admin';
            currentApproved = true;
            await setDoc(userDocRef, { role: 'admin', approved: true }, { merge: true });
          }
        }

        setRole(currentRole as UserRole);
        setIsApproved(currentApproved);

        // Listen for profile changes
        unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const newRole = data.role || 'user';
            const newApproved = data.approved || false;
            setIsApproved(newApproved);
            setRole(newRole as UserRole);
          }
        });

      } catch (error) {
        console.error("AuthContext: Profile setup error:", error);
      } finally {
        console.log("AuthContext: Profile setup complete, setting loading=false");
        setLoading(false);
      }
    };

    setupUserProfile();

    return () => {
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [user, gymInfo?.config?.apiKey, tenantDb, licenseLoading]); // Use more specific dependencies

  const isSuperAdmin = user?.email === "rodrigues.ueslei@gmail.com";
  const isLicenseOwner = licenseStatus === 'active';
  const isAdmin = role === 'admin' || isSuperAdmin || isLicenseOwner;
  const isApprovedFinal = isApproved || isSuperAdmin || isLicenseOwner;

  useEffect(() => {
    const effectiveRole = isLicenseOwner ? 'admin' : role;
    if (user && effectiveRole) {
      updatePermissions(effectiveRole, unsubRoleDocRef);
    }
  }, [user, role, isLicenseOwner, tenantDb]);

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await firebaseLoginWithEmail(email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const linkGoogle = async () => {
    if (!user) return;
    try {
      await linkWithPopup(user, googleProvider);
      // Force user update in state
      setUser({ ...masterAuth.currentUser! });
    } catch (error) {
      console.error("Link Google error:", error);
      throw error;
    }
  };

  const unlinkGoogle = async () => {
    if (!user) return;
    try {
      await unlink(user, GoogleAuthProvider.PROVIDER_ID);
      setUser({ ...masterAuth.currentUser! });
    } catch (error) {
      console.error("Unlink Google error:", error);
      throw error;
    }
  };

  const updateTenantConfig = async (configData: any) => {
    if (!user?.email) return;
    const licenseId = user.email.toLowerCase().trim();
    // Destructure branding if provided, otherwise keep it null to not overwrite
    const { branding, ...firebaseConfig } = configData;
    
    const updatePayload: any = {
      externalFirebaseConfig: firebaseConfig,
      status: 'active',
      updatedAt: serverTimestamp()
    };

    if (branding) {
      updatePayload.branding = branding;
    }

    await setDoc(doc(masterDb, 'licenses', licenseId), updatePayload, { merge: true });
  };

  const syncGymStats = useCallback(async (stats: { studentCount: number }) => {
    if (!user?.email || isSuperAdmin) return;
    const licenseId = user.email.toLowerCase().trim();
    try {
      await setDoc(doc(masterDb, 'licenses', licenseId), {
        stats: {
          studentCount: stats.studentCount,
          lastSync: serverTimestamp()
        }
      }, { merge: true });
    } catch (e) {
      console.error("Master sync error:", e);
    }
  }, [user?.email, isSuperAdmin]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading: loading || licenseLoading, 
      role, 
      permissions, 
      isApproved: isApprovedFinal, 
      isAdmin, 
      isSuperAdmin,
      isReceptionist: role === 'receptionist', 
      isProfessor: role === 'professor', 
      isCheckInTablet: role === 'checkin_tablet',
      licenseStatus,
      gymInfo,
      tenantDb,
      masterDb,
      logout,
      loginWithEmail,
      linkGoogle,
      unlinkGoogle,
      updateTenantConfig,
      syncGymStats
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
