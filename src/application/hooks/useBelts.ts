import { useState, useEffect, useMemo } from 'react';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export function useBelts() {
  const [belts, setBelts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  useEffect(() => {
    if (!tenantDb) {
      setLoading(false);
      return;
    }

    const q = query(collection(tenantDb, 'belts'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBelts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantDb]);

  const saveBelt = async (id: string | null, data: any) => {
    if (!tenantDb) return;
    try {
      if (id) {
        await updateDoc(doc(tenantDb, 'belts', id), data);
        toast.success("Faixa atualizada!");
      } else {
        await addDoc(collection(tenantDb, 'belts'), data);
        toast.success("Faixa criada!");
      }
    } catch (error) {
      toast.error("Erro ao salvar faixa.");
      throw error;
    }
  };

  const deleteBelt = async (id: string) => {
    if (!tenantDb) return;
    try {
      await deleteDoc(doc(tenantDb, 'belts', id));
      toast.success("Faixa excluída!");
    } catch (error) {
      toast.error("Erro ao excluir faixa.");
      throw error;
    }
  };

  return { belts, loading, saveBelt, deleteBelt };
}
