import { CheckIn } from '../../core/entities/CheckIn';
import { QueryConstraint } from 'firebase/firestore';

export interface ICheckInRepository {
  getAll(...constraints: QueryConstraint[]): Promise<CheckIn[]>;
  getById(id: string): Promise<CheckIn | null>;
  save(checkIn: Partial<CheckIn>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribe(callback: (checkIns: CheckIn[]) => void, ...constraints: QueryConstraint[]): () => void;
  getByStudentId(studentId: string): Promise<CheckIn[]>;
}
