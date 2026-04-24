import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { FirestoreExpenseRepository } from '../../infrastructure/firebase/repositories/FirestoreExpenseRepository';
import { IExpense } from '../ports/IExpenseRepository';
import toast from 'react-hot-toast';

export const useExpenses = (enabled: boolean = true) => {
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(() => new FirestoreExpenseRepository(db), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setExpenses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addExpense = async (data: Omit<IExpense, 'id'>) => {
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar despesa.");
      throw error;
    }
  };

  const updateExpense = async (id: string, data: Partial<IExpense>) => {
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar despesa.");
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir despesa.");
      throw error;
    }
  };

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense
  };
};
