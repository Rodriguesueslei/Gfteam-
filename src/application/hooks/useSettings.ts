import { useState, useEffect, useMemo } from 'react';
import { ISettings } from '../ports/ISettingsRepository';
import { FirestoreSettingsRepository } from '../../infrastructure/firebase/repositories/FirestoreSettingsRepository';
import { useAuth } from '../../contexts/AuthContext';

export function useSettings() {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { tenantDb } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreSettingsRepository(tenantDb) : null;
  }, [tenantDb]);

  useEffect(() => {
    if (!repository) {
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribeGlobalSettings((data) => {
      setSettings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository]);

  const updateSettings = async (data: Partial<ISettings>) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.updateGlobalSettings(data);
  };

  return { settings, loading, updateSettings };
}
