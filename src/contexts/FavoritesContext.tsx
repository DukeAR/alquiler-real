import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/apiConfig';
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
  getUnseenFavoritesCount: () => number;
  markFavoritesAsSeen: () => void;
  clearAllFavorites: () => Promise<void>;
};

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const PENDING_KEY = 'pendingFavoritesOps_v1';
const SEEN_FAVORITES_KEY_PREFIX = 'seenFavorites_v1';

const getSeenFavoritesKey = (userId: string) => `${SEEN_FAVORITES_KEY_PREFIX}:${userId}`;

const loadSeenFavoriteIds = (userId: string): string[] | null => {
  try {
    const raw = localStorage.getItem(getSeenFavoritesKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : null;
  } catch (err) {
    return null;
  }
};

const saveSeenFavoriteIds = (userId: string, ids: Iterable<string>) => {
  try {
    localStorage.setItem(getSeenFavoritesKey(userId), JSON.stringify(Array.from(new Set(ids))));
  } catch (err) {
    /* noop */
  }
};

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
};

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
  const [seenFavoriteIds, setSeenFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const syncingRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(user?.id ?? null);

  const openLoginModal = useCallback((message: string) => {
    showToast('Necesitás iniciar sesión', message, 'warning');
    void import('../lib/modal').then((module) => module.showLoginModal());
  }, []);

  const replaceSeenFavoriteIds = useCallback((nextIds: Iterable<string>) => {
    if (!user?.id) {
      setSeenFavoriteIds(new Set());
      return;
    }

    const nextSeenFavoriteIds = new Set(nextIds);
    saveSeenFavoriteIds(user.id, nextSeenFavoriteIds);
    setSeenFavoriteIds(nextSeenFavoriteIds);
  }, [user?.id]);

  const removeSeenFavoriteId = useCallback((propertyId: string) => {
    if (!user?.id) {
      return;
    }

    setSeenFavoriteIds((current) => {
      if (!current.has(propertyId)) {
        return current;
      }

      const nextSeenFavoriteIds = new Set(current);
      nextSeenFavoriteIds.delete(propertyId);
      saveSeenFavoriteIds(user.id, nextSeenFavoriteIds);
      return nextSeenFavoriteIds;
    });
  }, [user?.id]);

  useEffect(() => {
    const nextUserId = user?.id ?? null;

    if (activeUserIdRef.current === nextUserId) {
      return;
    }

    activeUserIdRef.current = nextUserId;
    setFavoritesMap(new Map());
    setSeenFavoriteIds(new Set());
    setIsLoading(Boolean(nextUserId));
  }, [user?.id]);

  // Load favorites (full objects) from backend
  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => { cancelled = true; };
    }

    if (!user?.id) {
      setFavoritesMap(new Map());
      setSeenFavoriteIds(new Set());
      setIsLoading(false);
      return () => { cancelled = true; };
    }

    (async () => {
      const requestUserId = user.id;
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/favorites');
        if (res.status === 401) {
          if (!cancelled) {
            setFavoritesMap(new Map());
            setSeenFavoriteIds(new Set());
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const favorites = Array.isArray(data) ? data : [];
        const m = new Map<string, PropertyObject>();
        favorites.forEach((p: any) => { if (p?.id) m.set(p.id, p); });
        const storedSeenFavoriteIds = loadSeenFavoriteIds(requestUserId);
        const nextSeenFavoriteIds = storedSeenFavoriteIds
          ? new Set(storedSeenFavoriteIds.filter((propertyId) => m.has(propertyId)))
          : new Set(m.keys());

        setFavoritesMap(m);
        saveSeenFavoriteIds(requestUserId, nextSeenFavoriteIds);
        setSeenFavoriteIds(nextSeenFavoriteIds);
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
            const payload = await res.json().catch(() => null) as { property?: PropertyObject } | null;
            if (payload?.property?.id) {
              setFavoritesMap((prev) => new Map(prev).set(payload.property!.id, payload.property!));
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
            removeSeenFavoriteId(op.propertyId);
          } else if (op.action === 'clear') {
            const res = await apiFetch('/api/favorites', { method: 'DELETE' });
            if (res.status === 401) {
              openLoginModal('Iniciá sesión para seguir sincronizando tus guardados.');
              return;
            }
            if (!res.ok) throw new Error('server');
            setFavoritesMap(new Map());
            replaceSeenFavoriteIds([]);
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
  }, [openLoginModal, removeSeenFavoriteId, replaceSeenFavoriteIds, user?.id]);

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
  const getUnseenFavoritesCount = useCallback(() => {
    let unseenCount = 0;

    favoritesMap.forEach((_, propertyId) => {
      if (!seenFavoriteIds.has(propertyId)) {
        unseenCount += 1;
      }
    });

    return unseenCount;
  }, [favoritesMap, seenFavoriteIds]);

  const markFavoritesAsSeen = useCallback(() => {
    if (!user?.id) {
      return;
    }

    const nextSeenFavoriteIds = new Set(favoritesMap.keys());
    saveSeenFavoriteIds(user.id, nextSeenFavoriteIds);
    setSeenFavoriteIds((current) => (areSetsEqual(current, nextSeenFavoriteIds) ? current : nextSeenFavoriteIds));
  }, [favoritesMap, user?.id]);

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
        removeSeenFavoriteId(propertyId);
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
        const payload = await res.json().catch(() => null) as { property?: PropertyObject } | null;
        if (payload?.property?.id) {
          setFavoritesMap((prev) => new Map(prev).set(payload.property!.id, payload.property!));
        }
        showToast('Guardados', 'La propiedad se agregó a tus guardados.', 'success');
        return 'added';
      } catch (err) {
        console.error('[FavoritesProvider] add error', err);
        // enqueue operation and keep optimistic placeholder for UX
        enqueueOp({ action: 'add', propertyId, ts: Date.now() });
        showToast('Guardados', 'No pudimos guardar esta propiedad ahora. La vamos a reintentar cuando recuperes conexión.', 'error');
        return 'pending-add';
      }
    }
  }, [favoritesMap, openLoginModal, removeSeenFavoriteId, user?.id]);

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
      replaceSeenFavoriteIds([]);
      showToast('Guardados', 'Ya vaciamos tus guardados.', 'success');
    } catch (err) {
      console.error('[FavoritesProvider] clearAll error', err);
      setFavoritesMap(prev);
      enqueueOp({ action: 'clear', ts: Date.now() });
      showToast('Guardados', 'No pudimos vaciar tus guardados ahora. Lo vamos a reintentar cuando recuperes conexión.', 'error');
    }
  }, [favoritesMap, openLoginModal, replaceSeenFavoriteIds, user?.id]);

  return (
    <FavoritesContext.Provider value={{ favoritesMap, isLoading, toggleFavorite, isFavorite, getFavoriteIds, getFavoritesCount, getUnseenFavoritesCount, markFavoritesAsSeen, clearAllFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesProvider;
