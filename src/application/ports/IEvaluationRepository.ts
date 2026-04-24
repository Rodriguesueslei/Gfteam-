import { Evaluation } from '../../core/entities/Evaluation';

export interface IEvaluationRepository {
  save(evaluation: Partial<Evaluation>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribeByStudentId(studentId: string, callback: (evaluations: Evaluation[]) => void): () => void;
}
