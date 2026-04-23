import { 
  Firestore,
  where
} from 'firebase/firestore';
import { CheckIn } from '../../../core/entities/CheckIn';
import { ICheckInRepository } from '../../../application/ports/ICheckInRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreCheckInRepository extends BaseFirestoreRepository<CheckIn> implements ICheckInRepository {
  constructor(db: Firestore) {
    super(db, 'checkins', 'time');
  }

  async getByStudentId(studentId: string): Promise<CheckIn[]> {
    return this.getAll(where('studentId', '==', studentId));
  }
}
