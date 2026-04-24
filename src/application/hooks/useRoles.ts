import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { FirestoreRoleRepository } from '../../infrastructure/firebase/repositories/FirestoreRoleRepository';
import { Role } from '../../core/entities/Role';

const roleRepository = new FirestoreRoleRepository(db);

export const useRoles = (subscribe: boolean = true) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subscribe) {
      roleRepository.getAllRoles().then(data => {
        setRoles(data);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = roleRepository.subscribeRoles((data) => {
      setRoles(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [subscribe]);

  const addRole = async (data: Omit<Role, 'id'>) => {
    return await roleRepository.addRole(data);
  };

  const updateRole = async (id: string, data: Partial<Role>) => {
    await roleRepository.updateRole(id, data);
  };

  const deleteRole = async (id: string) => {
    await roleRepository.deleteRole(id);
  };

  return { roles, loading, addRole, updateRole, deleteRole };
};
