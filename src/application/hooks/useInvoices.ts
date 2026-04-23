import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Invoice } from '../../core/entities/Invoice';
import { handleFirestoreError, OperationType } from '../../utils/errorHandlers';

export function useInvoices(enabled: boolean) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(tenantDb, 'invoices'),
      orderBy('dueDate', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'invoices');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, tenantDb]);

  return { invoices, loading };
}
