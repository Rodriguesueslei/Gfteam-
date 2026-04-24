import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IPlan, IPlanRepository } from '../../../application/ports/IPlanRepository';

export class FirestorePlanRepository 
  extends BaseFirestoreRepository<IPlan & { id: string }> 
  implements IPlanRepository {
  
  constructor(db: Firestore) {
    super(db, 'plans', 'name');
  }

  async findAll(): Promise<IPlan[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (data: IPlan[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async add(plan: Omit<IPlan, 'id'>): Promise<string> {
    return this.save(plan);
  }

  async update(id: string, plan: Partial<IPlan>): Promise<void> {
    await this.save({ ...plan, id });
  }
}
