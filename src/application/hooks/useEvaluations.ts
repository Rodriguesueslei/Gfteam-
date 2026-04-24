import { useState, useEffect, useMemo } from 'react';
import { Evaluation } from '../../core/entities/Evaluation';
import { FirestoreEvaluationRepository } from '../../infrastructure/firebase/repositories/FirestoreEvaluationRepository';
import { useAuth } from '../../contexts/AuthContext';

export function useEvaluations(enabled: boolean, isAdmin?: boolean, userEmail?: string) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreEvaluationRepository(tenantDb) : null;
  }, [tenantDb]);

  useEffect(() => {
    if (!enabled || !repository) {
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribe((data) => {
      if (isAdmin) {
        setEvaluations(data);
      } else if (userEmail) {
        // This is a bit inefficient as it filters client-side, 
        // but for a student portal with limited evals it's okay for now.
        // Ideally the repository would support filtered subscriptions.
        setEvaluations(data.filter(e => e.studentEmail === userEmail));
      } else {
        setEvaluations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, userEmail]);

  return { evaluations, loading };
}
