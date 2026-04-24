import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { FirestoreClassRepository } from '../../infrastructure/firebase/repositories/FirestoreClassRepository';
import { IClass } from '../ports/IClassRepository';
import toast from 'react-hot-toast';

export const useClasses = (enabled: boolean = true) => {
  const [classes, setClasses] = useState<IClass[]>([]);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(() => new FirestoreClassRepository(db), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setClasses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addClass = async (data: Omit<IClass, 'id'>) => {
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar aula.");
      throw error;
    }
  };

  const addBulkClasses = async (classes: Omit<IClass, 'id'>[]) => {
    try {
      await repository.addBulk(classes);
    } catch (error) {
      toast.error("Erro ao cadastrar aulas.");
      throw error;
    }
  };

  const updateClass = async (id: string, data: Partial<IClass>) => {
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar aula.");
      throw error;
    }
  };

  const updateBulkClasses = async (updates: { id: string, data: Partial<IClass> }[]) => {
    try {
      await repository.updateBulk(updates);
    } catch (error) {
      toast.error("Erro ao atualizar aulas.");
      throw error;
    }
  };

  const deleteClass = async (id: string) => {
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir aula.");
      throw error;
    }
  };

  const deleteBulkClasses = async (ids: string[]) => {
    try {
      await repository.deleteBulk(ids);
    } catch (error) {
      toast.error("Erro ao excluir aulas.");
      throw error;
    }
  };

  return {
    classes,
    loading,
    addClass,
    addBulkClasses,
    updateClass,
    updateBulkClasses,
    deleteClass,
    deleteBulkClasses
  };
};
