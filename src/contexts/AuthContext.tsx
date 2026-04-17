import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, logout as firebaseLogout } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

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
  isReceptionist: boolean;
  isProfessor: boolean;
  isCheckInTablet: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  role: 'user',
  permissions: DEFAULT_PERMISSIONS.user,
  isApproved: false,
  isAdmin: false,
  isReceptionist: false,
  isProfessor: false,
  isCheckInTablet: false,
  logout: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.user);
  const [isApproved, setIsApproved] = useState(false);
  const unsubRoleDocRef = React.useRef<(() => void) | null>(null);

  // Helper to fetch and set permissions based on role
  const updatePermissions = async (roleName: string, cleanupRef: { current: (() => void) | null }) => {
    // Cleanup previous role listener
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Check if it's a legacy role
    if (DEFAULT_PERMISSIONS[roleName]) {
      setPermissions(DEFAULT_PERMISSIONS[roleName]);
      return;
    }

    // Try to find custom role and listen to it
    cleanupRef.current = onSnapshot(doc(db, 'roles', roleName), (doc) => {
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
    
    // Safety timeout for loading state
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000); // 8 seconds safety

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      try {
        clearTimeout(loadingTimeout);
        setUser(authUser);

        if (authUser) {
          const userDocRef = doc(db, 'users', authUser.uid);
          
          // Initial check and bootstrap
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

            // Auto-bootstrap admin email if needed
            if (authUser.email === "rodrigues.ueslei@gmail.com" && (currentRole !== 'admin' || !currentApproved)) {
              currentRole = 'admin';
              currentApproved = true;
              await setDoc(userDocRef, { role: 'admin', approved: true }, { merge: true });
            }
          }

          setRole(currentRole);
          setIsApproved(currentApproved);

          // Listen for real-time updates to the user document
          unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const newRole = data.role || 'user';
              const newApproved = data.approved || false;
              
              setIsApproved(newApproved);
              setRole(newRole);
            }
          }, (error) => {
            console.error("Error listening to user document:", error);
          });
        } else {
          setRole('user');
          setPermissions(DEFAULT_PERMISSIONS.user);
          setIsApproved(false);
          if (unsubRoleDocRef.current) {
            unsubRoleDocRef.current();
            unsubRoleDocRef.current = null;
          }
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

  const isAdmin = role === 'admin';
  const isReceptionist = role === 'receptionist';
  const isProfessor = role === 'professor';
  const isCheckInTablet = role === 'checkin_tablet';

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  useEffect(() => {
    if (user && role) {
      updatePermissions(role, unsubRoleDocRef);
    }
    return () => {
      if (unsubRoleDocRef.current) {
        unsubRoleDocRef.current();
        unsubRoleDocRef.current = null;
      }
    };
  }, [user, role]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      role, 
      permissions, 
      isApproved, 
      isAdmin, 
      isReceptionist, 
      isProfessor, 
      isCheckInTablet,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
