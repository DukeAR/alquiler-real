import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '../lib/apiConfig';

export type UserMode = 'guest' | 'host';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'tenant' | 'host';
    canGuest: boolean;
    canHost: boolean;
    activeMode: UserMode;
    memberSince?: string;
    createdAt?: string;
    phone?: string;
    bio?: string;
    interests?: string;
    positiveReviews?: number;
    totalReviews?: number;
    rating?: number;
    profilePhoto?: string;
    zone?: string;
    hostRating?: number;
    totalProperties?: number;
    totalBookingsHosted?: number;
    badge?: string;
}

export interface UpdateProfilePayload {
    interests?: string[];
    bio?: string;
    name?: string;
    zone?: string | null;
    phone?: string | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthRefreshResult {
    user: User | null;
    status: Exclude<AuthStatus, 'loading'>;
    error: string | null;
}

export interface AuthContextValue {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    status: AuthStatus;
    error: string | null;
    sessionError: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, fullName: string, zone: string, phone?: string, bio?: string, interests?: string[]) => Promise<boolean>;
    setActiveMode: (mode: UserMode) => Promise<boolean>;
    logout: () => Promise<void>;
    refresh: () => Promise<AuthRefreshResult>;
    updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>;
    clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeInterests = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    if (value && typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return undefined;
        }
    }

    return undefined;
};

const normalizeUser = (user: any): User => ({
    ...user,
    name: user?.name || 'Usuario',
    role: user?.role === 'host' ? 'host' : 'tenant',
    canGuest: user?.canGuest !== false,
    canHost: Boolean(user?.canHost || user?.role === 'host'),
    activeMode: user?.activeMode === 'host' ? 'host' : user?.activeMode === 'guest' ? 'guest' : user?.role === 'host' ? 'host' : 'guest',
    interests: normalizeInterests(user?.interests),
});

const getProfileFallbackMessage = (status: number) => {
    switch (status) {
        case 400:
            return 'Revisá los datos del perfil y probá de nuevo.';
        case 401:
            return 'Tu sesión venció. Ingresá de nuevo para continuar.';
        default:
            return 'No pudimos guardar tu perfil. Intentá de nuevo.';
    }
};

const readUserFromResponse = async (response: Response, source: 'login' | 'register' | 'profile' | 'context') => {
    try {
        const data = await response.json();
        return data.user ? normalizeUser(data.user) : null;
    } catch (parseErr) {
        console.error(`[AuthContext] Failed to parse ${source} response:`, parseErr);
        return null;
    }
};

const getAuthErrorMessage = async (response: Response, fallbackMessage: string) => {
    const contentType = response.headers?.get?.('Content-Type') || '';
    const canReadJson = typeof response.json === 'function';
    const canReadText = typeof response.text === 'function';
    const isJsonResponse = contentType.includes('application/json');

    try {
        if (isJsonResponse || (!contentType && canReadJson)) {
            const data = await response.json();
            if (typeof data?.error === 'string' && data.error.trim()) {
                return data.error;
            }

            return fallbackMessage;
        }

        if (!canReadText) {
            return fallbackMessage;
        }

        const text = await response.text();
        const trimmedText = text.trim();

        if (!trimmedText || trimmedText.startsWith('<')) {
            return fallbackMessage;
        }

        if (trimmedText.startsWith('{')) {
            try {
                const data = JSON.parse(trimmedText);
                if (typeof data?.error === 'string' && data.error.trim()) {
                    return data.error;
                }
            } catch {
                return fallbackMessage;
            }
        }

        return trimmedText;
    } catch (parseErr) {
        console.error('[AuthContext] Failed to parse error response:', parseErr);
    }

    return fallbackMessage;
};

const getLoginFallbackMessage = (status: number) => {
    switch (status) {
        case 400:
            return 'Ingresá tu email y tu contraseña.';
        case 401:
            return 'El email o la contraseña no coinciden.';
        case 429:
            return 'Hay mucho movimiento ahora. Probá de nuevo en un rato.';
        default:
            return 'No pudimos iniciar sesión. Intentá de nuevo.';
    }
};

const getRegisterFallbackMessage = (status: number) => {
    switch (status) {
        case 400:
            return 'Revisá los datos y probá de nuevo.';
        case 409:
            return 'Ya existe una cuenta con ese email.';
        default:
            return 'No pudimos crear tu cuenta. Intentá de nuevo.';
    }
};

type SessionFetchResult = {
    user: User | null;
    status: Exclude<AuthStatus, 'loading'>;
    error: string | null;
};

const DEFAULT_SESSION_ERROR = 'No pudimos recuperar tu sesión. Intentá de nuevo.';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<AuthStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const userRef = useRef<User | null>(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const loadCurrentUser = useCallback(async (): Promise<SessionFetchResult> => {
        try {
            const response = await apiFetch('/api/auth/me', { includeCredentials: true });
            if (!response.ok) {
                const errorMessage = await getAuthErrorMessage(response, DEFAULT_SESSION_ERROR);
                return {
                    user: null,
                    status: 'error',
                    error: errorMessage,
                };
            }

            const data = await response.json();
            if (!data.user) {
                return {
                    user: null,
                    status: 'unauthenticated',
                    error: null,
                };
            }

            return {
                user: normalizeUser(data.user),
                status: 'authenticated',
                error: null,
            };
        } catch (err) {
            console.error('Fetch me error:', err);
            return {
                user: null,
                status: 'error',
                error: err instanceof Error ? err.message : DEFAULT_SESSION_ERROR,
            };
        }
    }, []);

    const syncSession = useCallback(async ({ initial = false, preserveUserOnError = false }: { initial?: boolean; preserveUserOnError?: boolean } = {}): Promise<AuthRefreshResult> => {
        if (initial) {
            setLoading(true);
            setStatus('loading');
        }

        try {
            const nextSession = await loadCurrentUser();

            if (nextSession.status === 'authenticated' && nextSession.user) {
                setUser(nextSession.user);
                setStatus('authenticated');
                setSessionError(null);
                return nextSession;
            }

            if (nextSession.status === 'unauthenticated') {
                setUser(null);
                setStatus('unauthenticated');
                setSessionError(null);
                return nextSession;
            }

            setSessionError(nextSession.error || DEFAULT_SESSION_ERROR);

            if (preserveUserOnError && userRef.current) {
                setStatus('authenticated');
                return {
                    user: userRef.current,
                    status: 'authenticated',
                    error: nextSession.error,
                };
            }

            setUser(null);
            setStatus('error');

            return {
                user: null,
                status: 'error',
                error: nextSession.error,
            };
        } finally {
            if (initial) {
                setLoading(false);
            }
        }
    }, [loadCurrentUser]);

    const syncUserFromResponse = useCallback(async (response: Response, source: 'login' | 'register' | 'profile' | 'context') => {
        const nextUser = await readUserFromResponse(response, source);

        if (nextUser) {
            setUser(nextUser);
            setStatus('authenticated');
            setSessionError(null);
            return {
                user: nextUser,
                status: 'authenticated' as const,
                error: null,
            };
        }

        return syncSession({ preserveUserOnError: source === 'profile' });
    }, [syncSession]);

    useEffect(() => {
        void syncSession({ initial: true });
    }, [syncSession]);

    const login = async (email: string, password: string) => {
        setError(null);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const response = await apiFetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password }),
                includeCredentials: true
            });
            
            if (response.ok) {
                const session = await syncUserFromResponse(response, 'login');
                if (session.status !== 'authenticated') {
                    setError(session.error || 'No pudimos confirmar tu sesión. Intentá de nuevo.');
                    return false;
                }
                return true;
            } else {
                const errorMsg = await getAuthErrorMessage(response, getLoginFallbackMessage(response.status));
                console.log('[AuthContext] Login failed:', errorMsg);
                if (!user) {
                    setStatus('unauthenticated');
                }
                setError(errorMsg);
                return false;
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'No pudimos conectarnos con el servidor. Intentá de nuevo.';
            console.error('[AuthContext] Login error:', errorMsg, err);
            setError(errorMsg);
            return false;
        }
    };

    const register = async (email: string, password: string, fullName: string, zone: string, phone?: string, bio?: string, interests?: string[]) => {
        setError(null);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const response = await apiFetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password, fullName, zone, phone, bio, interests }),
                includeCredentials: true
            });
            if (response.ok) {
                const session = await syncUserFromResponse(response, 'register');
                if (session.status !== 'authenticated') {
                    setError(session.error || 'No pudimos confirmar tu cuenta. Intentá de nuevo.');
                    return false;
                }
                return true;
            } else {
                const errorMsg = await getAuthErrorMessage(response, getRegisterFallbackMessage(response.status));
                if (!user) {
                    setStatus('unauthenticated');
                }
                setError(errorMsg);
                return false;
            }
        } catch (err) {
            console.error('[AuthContext] Register error:', err);
            setError(err instanceof Error ? err.message : 'No pudimos conectarnos con el servidor. Intentá de nuevo.');
            return false;
        }
    };

    const setActiveMode = useCallback(async (mode: UserMode) => {
        setError(null);

        try {
            const response = await apiFetch('/api/auth/context', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
                includeCredentials: true,
            });

            if (response.ok) {
                const session = await syncUserFromResponse(response, 'context');
                if (session.status !== 'authenticated') {
                    setError(session.error || 'No pudimos confirmar el cambio de modo. Intentá de nuevo.');
                    return false;
                }
                return true;
            }

            const errorMsg = await getAuthErrorMessage(response, 'No pudimos cambiar tu modo. Intentá de nuevo.');
            setError(errorMsg);
            return false;
        } catch (err) {
            console.error('[AuthContext] Set active mode error:', err);
            setError(err instanceof Error ? err.message : 'No pudimos cambiar tu modo. Intentá de nuevo.');
            return false;
        }
    }, [syncUserFromResponse]);

    const updateProfile = async (payload: UpdateProfilePayload) => {
        setError(null);

        try {
            const response = await apiFetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                includeCredentials: true,
            });

            if (response.ok) {
                const session = await syncUserFromResponse(response, 'profile');
                if (session.status !== 'authenticated') {
                    setError(session.error || 'No pudimos confirmar tu perfil actualizado. Intentá de nuevo.');
                    return false;
                }
                return true;
            }

            const errorMsg = await getAuthErrorMessage(response, getProfileFallbackMessage(response.status));
            setError(errorMsg);
            return false;
        } catch (err) {
            console.error('[AuthContext] Update profile error:', err);
            setError(err instanceof Error ? err.message : 'No pudimos guardar tu perfil. Intentá de nuevo.');
            return false;
        }
    };

    const logout = async () => {
        setError(null);

        try {
            await apiFetch('/api/auth/logout', { method: 'POST', includeCredentials: true });
            setUser(null);
            setStatus('unauthenticated');
            setSessionError(null);
        } catch (err) {
            console.error('[AuthContext] Logout error:', err);
            setError('No pudimos cerrar tu sesión. Intentá de nuevo.');
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user), status, error, sessionError, login, logout, register, setActiveMode, refresh: () => syncSession({ preserveUserOnError: true }), updateProfile, clearError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
