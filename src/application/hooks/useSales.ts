import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { FirestoreSaleRepository } from '../../infrastructure/firebase/repositories/FirestoreSaleRepository';
import { ISale } from '../ports/ISaleRepository';
import toast from 'react-hot-toast';

export const useSales = (enabled: boolean = true) => {
  const [sales, setSales] = useState<ISale[]>([]);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(() => new FirestoreSaleRepository(db), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setSales(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addSale = async (data: Omit<ISale, 'id'>) => {
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao registrar venda.");
      throw error;
    }
  };

  const updateSale = async (id: string, data: Partial<ISale>) => {
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar venda.");
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir venda.");
      throw error;
    }
  };

  return {
    sales,
    loading,
    addSale,
    updateSale,
    deleteSale
  };
};
