import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/apiConfig';

export type UserPreferences = {
  preferred_zone?: string | null;
  max_price?: number | string | null;
  preferred_property_type?: string | null;
};

type Options = {
  autoLoad?: boolean;
};

export function useUserPreferences(options: Options = {}) {
  const { autoLoad = true } = options;
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiJson<UserPreferences>('/api/users/preferences', { includeCredentials: true });
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar tus preferencias.');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreferences = useCallback(async (nextPreferences: UserPreferences) => {
    setSaving(true);
    setError(null);

    try {
      await apiJson('/api/users/preferences', {
        method: 'PUT',
        body: JSON.stringify(nextPreferences),
        includeCredentials: true,
      });

      setPreferences(nextPreferences);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar tus preferencias.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }

    void reload();
  }, [autoLoad, reload]);

  return {
    preferences,
    loading,
    saving,
    error,
    reload,
    savePreferences,
  };
}