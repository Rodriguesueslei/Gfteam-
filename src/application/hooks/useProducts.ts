import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { FirestoreProductRepository } from '../../infrastructure/firebase/repositories/FirestoreProductRepository';
import { IProduct } from '../ports/IProductRepository';
import toast from 'react-hot-toast';

export const useProducts = (enabled: boolean = true) => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(() => new FirestoreProductRepository(db), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addProduct = async (data: Omit<IProduct, 'id'>) => {
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar produto.");
      throw error;
    }
  };

  const updateProduct = async (id: string, data: Partial<IProduct>) => {
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar produto.");
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir produto.");
      throw error;
    }
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct
  };
};
