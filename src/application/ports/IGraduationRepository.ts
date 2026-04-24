import { Graduation } from '../../core/entities/Graduation';

export interface IGraduationRepository {
  save(graduation: Partial<Graduation>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribeByStudentId(studentId: string, callback: (graduations: Graduation[]) => void): () => void;
}
