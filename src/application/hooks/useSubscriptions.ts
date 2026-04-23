import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Subscription } from '../../core/entities/Subscription';
import { handleFirestoreError, OperationType } from '../../utils/errorHandlers';

export function useSubscriptions(enabled: boolean) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(tenantDb, 'subscriptions'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subscription[];
      setSubscriptions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'subscriptions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, tenantDb]);

  return { subscriptions, loading };
}
