import { useState, useEffect, useMemo } from 'react';
import { Payment } from '../../core/entities/Payment';
import { FirestorePaymentRepository } from '../../infrastructure/firebase/repositories/FirestorePaymentRepository';
import { useAuth } from '../../contexts/AuthContext';
import { QueryConstraint, limit, where } from 'firebase/firestore';
import { PaymentService } from '../services/PaymentService';

export function usePayments(enabled: boolean, isAdmin?: boolean, studentIds?: string[]) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestorePaymentRepository(tenantDb) : null;
  }, [tenantDb]);

  const service = useMemo(() => {
    return (repository && tenantDb) ? new PaymentService(repository, tenantDb) : null;
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
    
    // BaseFirestoreRepository handles the default 'date' orderBy defined in constructor
    const unsubscribe = repository.subscribe((data) => {
      setPayments(data);
      setLoading(false);
    }, ...constraints, limit(100));

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, studentIds]);

  const processPayment = async (payment: Partial<Payment>) => {
    if (!service) throw new Error("Service not initialized");
    return await service.processPayment(payment);
  };

  const processMensalidade = async (paymentData: any, student: any, duration: number) => {
    if (!service) throw new Error("Service not initialized");
    return await service.processMensalidade(paymentData, student, duration);
  };

  return { payments, loading, processPayment, processMensalidade };
}
