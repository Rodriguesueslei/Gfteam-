import { Firestore, where } from 'firebase/firestore';
import { Graduation } from '../../../core/entities/Graduation';
import { IGraduationRepository } from '../../../application/ports/IGraduationRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreGraduationRepository extends BaseFirestoreRepository<Graduation> implements IGraduationRepository {
  constructor(db: Firestore) {
    super(db, 'graduations', 'date');
  }

  subscribeByStudentId(studentId: string, callback: (graduations: Graduation[]) => void): () => void {
    return super.subscribe(callback, where('studentId', '==', studentId));
  }
}
