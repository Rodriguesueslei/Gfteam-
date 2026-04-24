import { useState, useEffect, useMemo } from 'react';
import { Graduation } from '../../core/entities/Graduation';
import { FirestoreGraduationRepository } from '../../infrastructure/firebase/repositories/FirestoreGraduationRepository';
import { useAuth } from '../../contexts/AuthContext';

export function useGraduations(enabled: boolean, isAdmin?: boolean, userEmail?: string) {
  const [graduations, setGraduations] = useState<Graduation[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreGraduationRepository(tenantDb) : null;
  }, [tenantDb]);

  useEffect(() => {
    if (!enabled || !repository) {
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribe((data) => {
      if (isAdmin) {
        setGraduations(data);
      } else if (userEmail) {
        setGraduations(data.filter(g => g.studentEmail === userEmail));
      } else {
        setGraduations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, userEmail]);

  return { graduations, loading };
}
