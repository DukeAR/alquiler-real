import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { type Booking } from '../types';

type Options = {
  autoLoad?: boolean;
};

export function useUserReservations(options: Options = {}) {
  const { autoLoad = true } = options;
  const [reservations, setReservations] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiJson<Booking[]>('/api/bookings/all', { includeCredentials: true });
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar tus reservas.');
    } finally {
      setLoading(false);
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
    reservations,
    setReservations,
    loading,
    error,
    reload,
  };
}