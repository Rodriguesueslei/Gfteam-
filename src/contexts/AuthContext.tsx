import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { auth as masterAuth, db as masterDb, createTenantInstance, logout as firebaseLogout } from '../firebase';
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

  // Dynamic Tenant Instances
  const tenantInstances = useMemo(() => {
    try {
      if (gymInfo?.config && gymInfo.config.apiKey) {
        return createTenantInstance(gymInfo.config);
      }
    } catch (err) {
      console.error("Critical Tenant Init Error:", err);
    }
    return { auth: masterAuth, db: masterDb };
  }, [gymInfo?.config]);

  const tenantDb = tenantInstances.db;

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

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000); 

    const unsubscribeAuth = onAuthStateChanged(masterAuth, async (authUser) => {
      try {
        clearTimeout(loadingTimeout);
        setUser(authUser);

        if (authUser) {
          if (authUser.email !== "rodrigues.ueslei@gmail.com") {
            setLicenseLoading(true);
          }

          // Important: We first check the user in the MASTER DB to see their role and license
          const userDocRef = doc(masterDb, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);
          let currentRole: string = 'user';
          let currentApproved: boolean = false;

          if (!userDoc.exists()) {
            const isDefaultAdmin = authUser.email === "rodrigues.ueslei@gmail.com";
            currentRole = isDefaultAdmin ? 'admin' : 'user';
            currentApproved = isDefaultAdmin;
            
            await setDoc(userDocRef, {
              name: authUser.displayName,
              email: authUser.email,
              photoURL: authUser.photoURL,
              role: currentRole,
              approved: currentApproved,
              createdAt: serverTimestamp()
            });
          } else {
            const data = userDoc.data();
            currentRole = data?.role || 'user';
            currentApproved = data?.approved || false;

            if (authUser.email === "rodrigues.ueslei@gmail.com" && (currentRole !== 'admin' || !currentApproved)) {
              currentRole = 'admin';
              currentApproved = true;
              await setDoc(userDocRef, { role: 'admin', approved: true }, { merge: true });
            }
          }

          setRole(currentRole);
          setIsApproved(currentApproved);

          unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const newRole = data.role || 'user';
              const newApproved = data.approved || false;
              setIsApproved(newApproved);
              setRole(newRole);
            }
          });
        } else {
          setRole('user');
          setPermissions(DEFAULT_PERMISSIONS.user);
          setIsApproved(false);
          setLicenseStatus('none');
          setGymInfo(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // License check for gym owners
  useEffect(() => {
    if (!user || user.email === "rodrigues.ueslei@gmail.com") {
      setLicenseLoading(false);
      return;
    }

    setLicenseLoading(true);
    const licenseId = user.email?.toLowerCase().trim();
    if (!licenseId) {
      setLicenseLoading(false);
      return;
    }

    unsubLicenseDocRef.current = onSnapshot(doc(masterDb, 'licenses', licenseId), (docSnap) => {
      if (docSnap.exists()) {
        const license = docSnap.data();
        setLicenseStatus(license.status as any);
        setGymInfo({
          name: license.academyName || 'Nova Academia',
          slug: license.slug || 'setup',
          isExternal: true, // Always true now in your new model
          config: license.externalFirebaseConfig
        });
      } else {
        setLicenseStatus('none');
        setGymInfo(null);
      }
      setLicenseLoading(false);
    }, (err) => {
      console.error("Error checking license:", err);
      setLicenseLoading(false);
    });

    return () => {
      if (unsubLicenseDocRef.current) {
        unsubLicenseDocRef.current();
        unsubLicenseDocRef.current = null;
      }
    };
  }, [user]);

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

  const syncGymStats = async (stats: { studentCount: number }) => {
    if (!user?.email || isSuperAdmin) return;
    const licenseId = user.email.toLowerCase().trim();
    try {
      await setDoc(doc(masterDb, 'licenses', licenseId), {
        stats: {
          ...stats,
          lastSync: serverTimestamp()
        }
      }, { merge: true });
    } catch (e) {
      console.error("Master sync error:", e);
    }
  };

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
      updateTenantConfig,
      syncGymStats
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
