import { Firestore, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ISettings, ISettingsRepository } from '../../../application/ports/ISettingsRepository';

export class FirestoreSettingsRepository implements ISettingsRepository {
  constructor(private db: Firestore) {}

  async getGlobalSettings(): Promise<ISettings | null> {
    const docRef = doc(this.db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ISettings;
    }
    return null;
  }

  subscribeGlobalSettings(callback: (settings: ISettings | null) => void): () => void {
    const docRef = doc(this.db, 'settings', 'global');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as ISettings);
      } else {
        callback(null);
      }
    });
  }

  async updateGlobalSettings(settings: Partial<ISettings>): Promise<void> {
    const docRef = doc(this.db, 'settings', 'global');
    await updateDoc(docRef, settings);
  }
}
