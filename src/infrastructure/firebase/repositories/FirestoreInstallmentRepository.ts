import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IInstallment, IInstallmentRepository } from '../../../application/ports/IInstallmentRepository';

export class FirestoreInstallmentRepository 
  extends BaseFirestoreRepository<IInstallment & { id: string }> 
  implements IInstallmentRepository {
  
  constructor(db: Firestore) {
    super(db, 'installments', 'dueDate');
  }

  async findAll(): Promise<IInstallment[]> {
    return this.getAll();
  }

  async update(id: string, installment: Partial<IInstallment>): Promise<void> {
    await this.save({ ...installment, id });
  }
}
