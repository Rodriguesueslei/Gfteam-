import { 
  Firestore,
  where,
  QueryConstraint
} from 'firebase/firestore';
import { Payment } from '../../../core/entities/Payment';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestorePaymentRepository extends BaseFirestoreRepository<Payment> {
  constructor(db: Firestore) {
    super(db, 'payments', 'date');
  }

  async getByStudentId(studentId: string): Promise<Payment[]> {
    return this.getAll(where('studentId', '==', studentId));
  }
}
