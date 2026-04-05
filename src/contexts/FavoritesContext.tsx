import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch, apiJson } from '../lib/apiConfig';
import { showToast } from '../lib/toast';

type PropertyObject = any;

export type ToggleFavoriteResult = 'added' | 'removed' | 'pending-add' | 'unchanged';

type FavoritesContextValue = {
  favoritesMap: Map<string, PropertyObject>;
  isLoading: boolean;
  toggleFavorite: (propertyId: string) => Promise<ToggleFavoriteResult>;
  isFavorite: (propertyId: string) => boolean;
  getFavoriteIds: () => string[];
  getFavoritesCount: () => number;
  clearAllFavorites: () => Promise<void>;
};

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const PENDING_KEY = 'pendingFavoritesOps_v1';

const loadPending = (): Array<any> => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) { return []; }
};

const savePending = (ops: Array<any>) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(ops)); } catch (err) { /* noop */ }
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [favoritesMap, setFavoritesMap] = useState<Map<string, PropertyObject>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const syncingRef = useRef(false);

  const openLoginModal = useCallback((message: string) => {
    showToast('Necesitás iniciar sesión', message, 'warning');
    void import('../lib/modal').then((module) => module.showLoginModal());
  }, []);

  // Load favorites (full objects) from backend
  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => { cancelled = true; };
    }

    if (!user?.id) {
      setFavoritesMap(new Map());
      setIsLoading(false);
      return () => { cancelled = true; };
    }

    (async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/favorites');
        if (res.status === 401) {
          if (!cancelled) {
            setFavoritesMap(new Map());
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const favorites = Array.isArray(data) ? data : [];
        const m = new Map<string, PropertyObject>();
        favorites.forEach((p: any) => { if (p?.id) m.set(p.id, p); });
        setFavoritesMap(m);
      } catch (err) {
        console.error('[FavoritesProvider] Error loading favorites', err);
        showToast('Error', 'No pudimos cargar tus guardados.', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  // Sync pending ops when back online
  const syncPending = useCallback(async () => {
    if (!user?.id || syncingRef.current) return;
    syncingRef.current = true;
    try {
      let ops = loadPending();
      if (!ops.length) return;
      const remaining: Array<any> = [];
      for (const op of ops) {
        try {
          if (op.action === 'add') {
            const res = await apiFetch(`/api/favorites/${op.propertyId}`, { method: 'POST' });
            if (res.status === 401) {
              openLoginModal('Iniciá sesión para seguir sincronizando tus guardados.');
              return;
            }
            if (!res.ok) throw new Error('server');
            // fetch full property and cache
            try {
              const p = await apiJson<PropertyObject>(`/api/properties/${op.propertyId}`);
              setFavoritesMap(prev => new Map(prev).set(p.id, p));
            } catch {
              // ignore property fetch failure and keep sync result only
            }
          } else if (op.action === 'remove') {
            const res = await apiFetch(`/api/favorites/${op.propertyId}`, { method: 'DELETE' });
            if (res.status === 401) {
              openLoginModal('Iniciá sesión para seguir sincronizando tus guardados.');
              return;
            }
            if (!res.ok) throw new Error('server');
            setFavoritesMap(prev => {
              const copy = new Map(prev);
              copy.delete(op.propertyId);
              return copy;
            });
          } else if (op.action === 'clear') {
            const res = await apiFetch('/api/favorites', { method: 'DELETE' });
            if (res.status === 401) {
              openLoginModal('Iniciá sesión para seguir sincronizando tus guardados.');
              return;
            }
            if (!res.ok) throw new Error('server');
            setFavoritesMap(new Map());
          }
        } catch (err) {
          // keep op for later
          remaining.push(op);
        }
      }
      savePending(remaining);
    } finally {
      syncingRef.current = false;
    }
  }, [openLoginModal, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return () => undefined;
    }

    const onOnline = () => { syncPending(); };
    window.addEventListener('online', onOnline);
    // attempt initial sync on mount
    void syncPending();
    return () => window.removeEventListener('online', onOnline);
  }, [syncPending, user?.id]);

  const isFavorite = useCallback((propertyId: string) => {
    return favoritesMap.has(propertyId);
  }, [favoritesMap]);

  const getFavoriteIds = useCallback(() => Array.from(favoritesMap.keys()), [favoritesMap]);
  const getFavoritesCount = useCallback(() => favoritesMap.size, [favoritesMap]);

  const enqueueOp = (op: any) => {
    const ops = loadPending();
    ops.push(op);
    savePending(ops);
  };

  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (!user?.id) {
      openLoginModal('Iniciá sesión para guardar o quitar propiedades de tus guardados.');
      return 'unchanged';
    }

    const currently = favoritesMap.has(propertyId);

    if (currently) {
      // optimistic remove
      const prevMap = new Map(favoritesMap);
      setFavoritesMap(prev => {
        const copy = new Map(prev);
        copy.delete(propertyId);
        return copy;
      });
      // Note: above odd pattern ensures TS/JS compatibility without extra helpers
      try {
        const res = await apiFetch(`/api/favorites/${propertyId}`, { method: 'DELETE' });
        if (res.status === 401) {
          // rollback
          setFavoritesMap(prevMap);
          openLoginModal('Iniciá sesión para gestionar tus guardados.');
          return 'unchanged';
        }
        if (!res.ok) throw new Error('server');
        showToast('Guardados', 'Quitamos la propiedad de tus guardados.', 'success');
        return 'removed';
      } catch (err) {
        console.error('[FavoritesProvider] remove error', err);
        // rollback locally and enqueue for later
        setFavoritesMap(prevMap);
        enqueueOp({ action: 'remove', propertyId, ts: Date.now() });
        showToast('Guardados', 'No pudimos actualizar tus guardados ahora. Lo vamos a reintentar cuando recuperes conexión.', 'error');
        return 'unchanged';
      }
    } else {
      // optimistic add — insert placeholder
      const prevMap = new Map(favoritesMap);
      setFavoritesMap(prev => {
        const copy = new Map(prev);
        copy.set(propertyId, { id: propertyId, _optimistic: true });
        return copy;
      });
      try {
        const res = await apiFetch(`/api/favorites/${propertyId}`, { method: 'POST' });
        if (res.status === 401) {
          // rollback
          setFavoritesMap(prevMap);
          openLoginModal('Iniciá sesión para guardar propiedades.');
          return 'unchanged';
        }
        if (!res.ok) throw new Error('server');
        // fetch full property and replace placeholder
        try {
          const p = await apiJson<PropertyObject>(`/api/properties/${propertyId}`);
          setFavoritesMap(prev => new Map(prev).set(p.id, p));
        } catch {
          // leave placeholder if we can't fetch details
          showToast('Guardados', 'La propiedad se agregó a tus guardados.', 'success');
        }
        return 'added';
      } catch (err) {
        console.error('[FavoritesProvider] add error', err);
        // enqueue operation and keep optimistic placeholder for UX
        enqueueOp({ action: 'add', propertyId, ts: Date.now() });
        showToast('Guardados', 'No pudimos guardar esta propiedad ahora. La vamos a reintentar cuando recuperes conexión.', 'error');
        return 'pending-add';
      }
    }
  }, [favoritesMap, openLoginModal, user?.id]);

  const clearAllFavorites = useCallback(async () => {
    if (!user?.id) {
      openLoginModal('Iniciá sesión para vaciar tus guardados.');
      return;
    }

    const prev = new Map(favoritesMap);
    setFavoritesMap(new Map());
    try {
      const res = await apiFetch('/api/favorites', { method: 'DELETE' });
      if (res.status === 401) {
        setFavoritesMap(prev);
        openLoginModal('Iniciá sesión para vaciar tus guardados.');
        return;
      }
      if (!res.ok) throw new Error('server');
      showToast('Guardados', 'Ya vaciamos tus guardados.', 'success');
    } catch (err) {
      console.error('[FavoritesProvider] clearAll error', err);
      setFavoritesMap(prev);
      enqueueOp({ action: 'clear', ts: Date.now() });
      showToast('Guardados', 'No pudimos vaciar tus guardados ahora. Lo vamos a reintentar cuando recuperes conexión.', 'error');
    }
  }, [favoritesMap, openLoginModal, user?.id]);

  return (
    <FavoritesContext.Provider value={{ favoritesMap, isLoading, toggleFavorite, isFavorite, getFavoriteIds, getFavoritesCount, clearAllFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesProvider;
