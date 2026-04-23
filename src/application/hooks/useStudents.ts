import { useState, useEffect, useMemo } from 'react';
import { Student, StudentFilters } from '../../core/entities/Student';
import { FirestoreStudentRepository } from '../../infrastructure/firebase/repositories/FirestoreStudentRepository';
import { useAuth } from '../../contexts/AuthContext';

export function useStudents(enabled: boolean, isAdmin?: boolean, userEmail?: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreStudentRepository(tenantDb) : null;
  }, [tenantDb]);

  useEffect(() => {
    if (!enabled || !repository) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const filters: StudentFilters = {};
    if (!isAdmin && userEmail) {
      filters.email = userEmail;
    } else if (!isAdmin && !userEmail) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribeStudents((data) => {
      setStudents(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, userEmail]);

  const addStudent = async (student: Partial<Student>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.save(student);
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.save({ ...data, id });
  };

  const deleteStudent = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.delete(id);
  };

  return { students, loading, addStudent, updateStudent, deleteStudent };
}
