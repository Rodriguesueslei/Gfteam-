import { useState, useEffect, useMemo } from 'react';
import { CheckIn } from '../../core/entities/CheckIn';
import { FirestoreCheckInRepository } from '../../infrastructure/firebase/repositories/FirestoreCheckInRepository';
import { useAuth } from '../../contexts/AuthContext';
import { QueryConstraint, limit, where } from 'firebase/firestore';
import { CheckInService } from '../services/CheckInService';

export function useCheckIn(enabled: boolean, isAdmin?: boolean, studentIds?: string[]) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreCheckInRepository(tenantDb) : null;
  }, [tenantDb]);

  const service = useMemo(() => {
    return (repository && tenantDb) ? new CheckInService(repository, tenantDb) : null;
  }, [repository, tenantDb]);

  useEffect(() => {
    if (!enabled || !repository) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const constraints: QueryConstraint[] = [];
    if (!isAdmin && studentIds && studentIds.length > 0) {
      constraints.push(where('studentId', 'in', studentIds));
    }
    
    const unsubscribe = repository.subscribe((data) => {
      setCheckIns(data);
      setLoading(false);
    }, ...constraints, limit(500));

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, studentIds]);

  const registerCheckIn = async (checkIn: Partial<CheckIn>, classData: any) => {
    if (!service) throw new Error("Service not initialized");
    return await service.registerCheckIn(checkIn, classData);
  };

  return { checkIns, loading, registerCheckIn };
}
