import { Firestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';

export async function seedTenantData(db: Firestore) {
  const tenantId = 'default_gym';
  const tenantRef = doc(db, 'tenants', tenantId);
  
  try {
    const tenantSnap = await getDoc(tenantRef);
    
    // 1. Create initial tenant if it doesn't exist
    if (!tenantSnap.exists()) {
      console.log('Seeding initial tenant...');
      await setDoc(tenantRef, {
        id: tenantId,
        name: 'GF Team',
        plan: 'pro',
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Connect existing users to this tenant
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const batch = writeBatch(db);
    let count = 0;
    
    usersSnap.forEach((userDoc) => {
      const data = userDoc.data();
      if (!data.tenantId) {
        batch.update(userDoc.ref, { tenantId });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Updated ${count} users with default tenantId.`);
    }

    // 3. Connect other orphan data
    const collectionsToUpdate = ['students', 'payments', 'checkins', 'classes', 'graduations', 'evaluations', 'plans', 'instructors', 'products', 'sales', 'expenses', 'installments', 'invoices', 'subscriptions'];
    
    for (const collName of collectionsToUpdate) {
      const collRef = collection(db, collName);
      const snap = await getDocs(collRef);
      
      const collBatch = writeBatch(db);
      let collCount = 0;
      
      snap.forEach((doc) => {
        if (!doc.data().tenantId) {
          collBatch.update(doc.ref, { tenantId });
          collCount++;
        }
      });
      
      if (collCount > 0) {
        await collBatch.commit();
        console.log(`Updated ${collCount} documents in ${collName} with default tenantId.`);
      }
    }
    
  } catch (error) {
    console.error('Error seeding tenant data:', error);
  }
}
