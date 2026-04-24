import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { ILicensesRepository } from '../../../application/ports/ILicensesRepository';
import { Observable } from 'rxjs';

export class FirestoreLicensesRepository implements ILicensesRepository {
  private collectionName = 'licenses';

  async getLicenses(): Promise<any[]> {
    const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  subscribeLicenses(): Observable<any[]> {
    return new Observable(observer => {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        observer.next(data);
      }, (error) => {
        observer.error(error);
      });
    });
  }

  async saveLicense(id: string, data: any): Promise<void> {
    const licenseRef = doc(db, this.collectionName, id);
    await setDoc(licenseRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async deleteLicense(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  async updateUserRole(email: string, role: string): Promise<void> {
    const userRef = doc(db, 'users', email);
    await setDoc(userRef, {
      email,
      role,
      approved: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}
