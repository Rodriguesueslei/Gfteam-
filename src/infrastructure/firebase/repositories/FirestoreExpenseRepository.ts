import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IExpense, IExpenseRepository } from '../../../application/ports/IExpenseRepository';

export class FirestoreExpenseRepository 
  extends BaseFirestoreRepository<IExpense & { id: string }> 
  implements IExpenseRepository {
  
  constructor(db: Firestore) {
    super(db, 'expenses', 'date');
  }

  async findAll(): Promise<IExpense[]> {
    return this.getAll();
  }

  async add(expense: Omit<IExpense, 'id'>): Promise<string> {
    return this.save(expense);
  }

  async update(id: string, expense: Partial<IExpense>): Promise<void> {
    await this.save({ ...expense, id });
  }
}
