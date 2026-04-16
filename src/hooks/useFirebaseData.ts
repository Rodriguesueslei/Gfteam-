import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc, 
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
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

export const useStudents = (enabled: boolean) => {
  const [students, setStudents] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'students'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });
    return () => unsubscribe();
  }, [enabled]);
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

export const usePayments = (enabled: boolean) => {
  const [payments, setPayments] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'payments'), orderBy('date', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });
    return () => unsubscribe();
  }, [enabled]);
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

export const useCheckIns = (enabled: boolean) => {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, 'checkins'), orderBy('time', 'desc'), limit(1000));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCheckIns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'checkins');
    });
    return () => unsubscribe();
  }, [enabled]);
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
