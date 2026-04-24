import { useState, useEffect, useMemo } from 'react';
import { Student, StudentFilters } from '../../core/entities/Student';
import { Graduation } from '../../core/entities/Graduation';
import { Evaluation } from '../../core/entities/Evaluation';
import { FirestoreStudentRepository } from '../../infrastructure/firebase/repositories/FirestoreStudentRepository';
import { FirestoreGraduationRepository } from '../../infrastructure/firebase/repositories/FirestoreGraduationRepository';
import { FirestoreEvaluationRepository } from '../../infrastructure/firebase/repositories/FirestoreEvaluationRepository';
import { useAuth } from '../../contexts/AuthContext';

export function useStudents(enabled: boolean, isAdmin?: boolean, userEmail?: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreStudentRepository(tenantDb) : null;
  }, [tenantDb]);

  const gradRepository = useMemo(() => {
    return tenantDb ? new FirestoreGraduationRepository(tenantDb) : null;
  }, [tenantDb]);

  const evalRepository = useMemo(() => {
    return tenantDb ? new FirestoreEvaluationRepository(tenantDb) : null;
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

  const addGraduation = async (graduation: Partial<Graduation>) => {
    if (!gradRepository) throw new Error("Graduation repository not initialized");
    return await gradRepository.save(graduation);
  };

  const deleteGraduation = async (id: string) => {
    if (!gradRepository) throw new Error("Graduation repository not initialized");
    await gradRepository.delete(id);
  };

  const addEvaluation = async (evaluation: Partial<Evaluation>) => {
    if (!evalRepository) throw new Error("Evaluation repository not initialized");
    return await evalRepository.save(evaluation);
  };

  const deleteEvaluation = async (id: string) => {
    if (!evalRepository) throw new Error("Evaluation repository not initialized");
    await evalRepository.delete(id);
  };

  return { 
    students, 
    loading, 
    addStudent, 
    updateStudent, 
    deleteStudent,
    addGraduation,
    deleteGraduation,
    addEvaluation,
    deleteEvaluation
  };
}
