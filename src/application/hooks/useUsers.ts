import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { FirestoreUserRepository } from '../../infrastructure/firebase/repositories/FirestoreUserRepository';
import { User, UserFilters } from '../../core/entities/User';

const userRepository = new FirestoreUserRepository(db);

export const useUsers = (subscribe: boolean = true, filters?: UserFilters) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subscribe) {
      userRepository.getAllUsers(filters).then(data => {
        setUsers(data);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = userRepository.subscribeUsers((data) => {
      setUsers(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [subscribe, JSON.stringify(filters)]);

  const updateUser = async (id: string, data: Partial<User>) => {
    await userRepository.updateUser(id, data);
  };

  const deleteUser = async (id: string) => {
    await userRepository.deleteUser(id);
  };

  const addUser = async (data: Omit<User, 'id'>) => {
    return await userRepository.addUser(data);
  };

  return { users, loading, updateUser, deleteUser, addUser };
};
