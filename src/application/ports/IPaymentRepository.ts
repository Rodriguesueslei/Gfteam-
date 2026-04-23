import { Payment } from '../../core/entities/Payment';
import { QueryConstraint } from 'firebase/firestore';

export interface IPaymentRepository {
  getAll(...constraints: QueryConstraint[]): Promise<Payment[]>;
  getById(id: string): Promise<Payment | null>;
  save(payment: Partial<Payment>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribe(callback: (payments: Payment[]) => void, ...constraints: QueryConstraint[]): () => void;
  getByStudentId(studentId: string): Promise<Payment[]>;
}
