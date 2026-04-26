import { useState, useEffect, useMemo } from 'react';
import { FirestoreUserRepository } from '../../infrastructure/firebase/repositories/FirestoreUserRepository';
import { User, UserFilters } from '../../core/entities/User';
import { useAuth } from '../../contexts/AuthContext';

export const useUsers = (subscribe: boolean = true, filters?: UserFilters) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreUserRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!repository || !subscribe || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribeUsers((data) => {
      setUsers(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [repository, subscribe, JSON.stringify(filters)]);

  const updateUser = async (id: string, data: Partial<User>) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.updateUser(id, data);
  };

  const deleteUser = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.deleteUser(id);
  };

  const addUser = async (data: Omit<User, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.addUser(data);
  };

  return { users, loading, updateUser, deleteUser, addUser };
};
