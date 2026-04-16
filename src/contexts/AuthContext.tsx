import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

export type UserRole = 'admin' | 'receptionist' | 'professor' | 'user' | 'checkin_tablet';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isApproved: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
  isProfessor: boolean;
  isCheckInTablet: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  role: 'user',
  isApproved: false,
  isAdmin: false,
  isReceptionist: false,
  isProfessor: false,
  isCheckInTablet: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    // Safety timeout for loading state
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(loadingTimeout);
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Initial check and bootstrap
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const isDefaultAdmin = user.email === "rodrigues.ueslei@gmail.com";
          const initialRole: UserRole = isDefaultAdmin ? 'admin' : 'user';
          const initialApproved = isDefaultAdmin;
          
          await setDoc(userDocRef, {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: initialRole,
            approved: initialApproved,
            createdAt: serverTimestamp()
          });
          setRole(initialRole);
          setIsApproved(initialApproved);
        } else {
          const data = userDoc.data();
          const currentRole = data?.role || 'user';
          const currentApproved = data?.approved || false;

          if (user.email === "rodrigues.ueslei@gmail.com" && (currentRole !== 'admin' || !currentApproved)) {
            await setDoc(userDocRef, { role: 'admin', approved: true }, { merge: true });
            setRole('admin');
            setIsApproved(true);
          } else {
            setRole(currentRole);
            setIsApproved(currentApproved);
          }
        }

        // Listen for real-time updates to the user document
        unsubUserDoc = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setRole(data.role || 'user');
            setIsApproved(data.approved || false);
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
        });
      } else {
        setRole('user');
        setIsApproved(false);
        if (unsubUserDoc) unsubUserDoc();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const isAdmin = role === 'admin';
  const isReceptionist = role === 'receptionist';
  const isProfessor = role === 'professor';
  const isCheckInTablet = role === 'checkin_tablet';

  return (
    <AuthContext.Provider value={{ user, loading, role, isApproved, isAdmin, isReceptionist, isProfessor, isCheckInTablet }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
