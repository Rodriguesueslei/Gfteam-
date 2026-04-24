import { 
  Firestore,
  where,
  QueryConstraint
} from 'firebase/firestore';
import { User, UserFilters } from '../../../core/entities/User';
import { IUserRepository } from '../../../application/ports/IUserRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreUserRepository extends BaseFirestoreRepository<User> implements IUserRepository {
  constructor(db: Firestore) {
    super(db, 'users', 'name');
  }

  private buildConstraints(filters?: UserFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (filters?.role) {
      constraints.push(where('role', '==', filters.role));
    }
    if (filters?.approved !== undefined) {
      constraints.push(where('approved', '==', filters.approved));
    }
    return constraints;
  }

  async getAllUsers(filters?: UserFilters): Promise<User[]> {
    return super.getAll(...this.buildConstraints(filters));
  }

  subscribeUsers(callback: (users: User[]) => void, filters?: UserFilters): () => void {
    return super.subscribe(callback, ...this.buildConstraints(filters));
  }

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    await this.save({ ...data, id });
  }

  async deleteUser(id: string): Promise<void> {
    return super.delete(id);
  }

  async addUser(data: Omit<User, 'id'>): Promise<string> {
    return this.save(data as any);
  }
}
