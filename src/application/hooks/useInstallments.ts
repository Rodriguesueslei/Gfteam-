import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { FirestoreInstallmentRepository } from '../../infrastructure/firebase/repositories/FirestoreInstallmentRepository';
import { IInstallment } from '../ports/IInstallmentRepository';
import toast from 'react-hot-toast';

export const useInstallments = (enabled: boolean = true) => {
  const [installments, setInstallments] = useState<IInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(() => new FirestoreInstallmentRepository(db), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setInstallments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const updateInstallment = async (id: string, data: Partial<IInstallment>) => {
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar parcela.");
      throw error;
    }
  };

  const addInstallment = async (data: Omit<IInstallment, 'id'>) => {
    try {
      return await repository.save(data as any);
    } catch (error) {
      toast.error("Erro ao cadastrar parcela.");
      throw error;
    }
  };

  const deleteInstallment = async (id: string) => {
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir parcela.");
      throw error;
    }
  };

  return {
    installments,
    loading,
    addInstallment,
    updateInstallment,
    deleteInstallment
  };
};
