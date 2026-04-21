import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc, 
  getDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';

export const useBelts = (enabled: boolean) => {
  const [belts, setBelts] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'belts'), orderBy('order'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBelts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'belts');
    });
    return () => unsubscribe();
  }, [enabled]);
  return belts;
};

export const useStudents = (enabled: boolean, userEmail?: string | null, isAdmin?: boolean) => {
  const [students, setStudents] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, 'students'), orderBy('name'));
    } else if (userEmail) {
      q = query(collection(db, 'students'), where('email', '==', userEmail));
    } else {
      // If we don't know if they are admin or what's their email, we don't fetch
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });
    return () => unsubscribe();
  }, [enabled, userEmail, isAdmin]);
  return students;
};

export const useClasses = (enabled: boolean) => {
  const [classes, setClasses] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'classes'), orderBy('startTime'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'classes');
    });
    return () => unsubscribe();
  }, [enabled]);
  return classes;
};

export const usePayments = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [payments, setPayments] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, 'payments'), orderBy('date', 'desc'), limit(100));
    } else if (studentIds && studentIds.length > 0) {
      // If studentIds list is large, we might need multiple queries, but usually it's 1-3
      q = query(collection(db, 'payments'), where('studentId', 'in', studentIds), orderBy('date', 'desc'), limit(100));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds]);
  return payments;
};

export const useInstructors = (enabled: boolean) => {
  const [instructors, setInstructors] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'instructors'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setInstructors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching instructors collection:", error);
    });
    return () => unsubscribe();
  }, [enabled]);
  return instructors;
};

export const usePlans = (enabled: boolean) => {
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'plans'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching plans collection:", error);
    });
    return () => unsubscribe();
  }, [enabled]);
  return plans;
};

export const useProducts = (enabled: boolean) => {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching products collection:", error);
    });
    return () => unsubscribe();
  }, [enabled]);
  return products;
};

export const useSales = (enabled: boolean) => {
  const [sales, setSales] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching sales collection:", error);
    });
    return () => unsubscribe();
  }, [enabled]);
  return sales;
};

export const useUsers = (enabled: boolean) => {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching users collection:", error);
    });
    return () => unsubscribe();
  }, [enabled]);
  return users;
};

export const useCheckIns = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, 'checkins'), orderBy('time', 'desc'), limit(1000));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(db, 'checkins'), where('studentId', 'in', studentIds), orderBy('time', 'desc'), limit(200));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setCheckIns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'checkins');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds]);
  return checkIns;
};

export const useExpenses = (enabled: boolean) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching expenses collection:", error);
    });
    return () => unsubscribe();
  }, [enabled]);
  return expenses;
};

export const useInstallments = (enabled: boolean) => {
  const [installments, setInstallments] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'installments'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'installments');
    });
    return () => unsubscribe();
  }, [enabled]);
  return installments;
};

export const useEvaluations = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, 'evaluations'), orderBy('date', 'desc'));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(db, 'evaluations'), where('studentId', 'in', studentIds), orderBy('date', 'desc'));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setEvaluations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'evaluations');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds]);
  return evaluations;
};

export const useGraduations = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [graduations, setGraduations] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, 'graduations'), orderBy('date', 'desc'));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(db, 'graduations'), where('studentId', 'in', studentIds), orderBy('date', 'desc'));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setGraduations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'graduations');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds]);
  return graduations;
};

export const useRoles = (enabled: boolean) => {
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'roles'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRoles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roles');
    });
    return () => unsubscribe();
  }, [enabled]);
  return roles;
};

export const useSettings = (enabled: boolean) => {
  const [settings, setSettings] = useState<any>({});
  useEffect(() => {
    if (!enabled) return;
    
    getDoc(doc(db, 'settings', 'global')).then(doc => {
      if (doc.exists()) setSettings(doc.data());
    }).catch(err => console.error("Initial settings fetch error:", err));

    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      } else {
        setSettings({});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
      setSettings({});
    });
    return () => unsubscribe();
  }, [enabled]);
  return settings;
};

export const usePrivateSettings = (isAdmin: boolean) => {
  const [secrets, setSecrets] = useState<any>({});
  const { user } = useAuth();

  useEffect(() => {
    if (!isAdmin || !user) return;
    
    getDoc(doc(db, 'secret_settings', 'global')).then(doc => {
      if (doc.exists()) setSecrets(doc.data());
    }).catch(err => console.error("Initial secrets fetch error:", err));

    const unsubscribe = onSnapshot(doc(db, 'secret_settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSecrets(doc.data());
      } else {
        setSecrets({});
      }
    }, (error) => {
      console.error("Error fetching secrets:", error);
      setSecrets({});
    });
    return () => unsubscribe();
  }, [isAdmin]);
  return secrets;
};

export const useBackups = (enabled: boolean) => {
  const [backups, setBackups] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'backups'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBackups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'backups');
    });
    return () => unsubscribe();
  }, [enabled]);
  return backups;
};

export const useLicenses = (isSuperAdmin: boolean) => {
  const [licenses, setLicenses] = useState<any[]>([]);
  useEffect(() => {
    if (!isSuperAdmin) return;
    const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLicenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'licenses');
    });
    return () => unsubscribe();
  }, [isSuperAdmin]);
  return licenses;
};
