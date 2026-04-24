import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IInstructor, IInstructorRepository } from '../../../application/ports/IInstructorRepository';

export class FirestoreInstructorRepository 
  extends BaseFirestoreRepository<IInstructor & { id: string }> 
  implements IInstructorRepository {
  
  constructor(db: Firestore) {
    super(db, 'instructors');
  }

  async findAll(): Promise<IInstructor[]> {
    return this.getAll();
  }

  async findById(id: string): Promise<IInstructor | null> {
    return this.getById(id);
  }

  async add(instructor: Omit<IInstructor, 'id'>): Promise<string> {
    return this.save(instructor);
  }

  async update(id: string, instructor: Partial<IInstructor>): Promise<void> {
    await this.save({ ...instructor, id });
  }

  // delete is already implemented in BaseFirestoreRepository
}
