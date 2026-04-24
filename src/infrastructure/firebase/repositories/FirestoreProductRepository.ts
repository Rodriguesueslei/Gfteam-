import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IProduct, IProductRepository } from '../../../application/ports/IProductRepository';

export class FirestoreProductRepository 
  extends BaseFirestoreRepository<IProduct & { id: string }> 
  implements IProductRepository {
  
  constructor(db: Firestore) {
    super(db, 'products', 'name');
  }

  async findAll(): Promise<IProduct[]> {
    return this.getAll();
  }

  async add(product: Omit<IProduct, 'id'>): Promise<string> {
    return this.save(product);
  }

  async update(id: string, product: Partial<IProduct>): Promise<void> {
    await this.save({ ...product, id });
  }
}
