import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '../lib/apiConfig';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'tenant' | 'host';
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
    trustScore?: number;
    riskScore?: number;
}

export interface UpdateProfilePayload {
    interests?: string[];
    bio?: string;
    name?: string;
    zone?: string | null;
    phone?: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, role: User['role'], fullName: string, zone: string, phone?: string, bio?: string, interests?: string[]) => Promise<boolean>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

const readUserFromResponse = async (response: Response, source: 'login' | 'register' | 'profile') => {
    try {
        const data = await response.json();
        return data.user ? normalizeUser(data.user) : null;
    } catch (parseErr) {
        console.error(`[AuthContext] Failed to parse ${source} response:`, parseErr);
        return null;
    }
};

const getAuthErrorMessage = async (response: Response, fallbackMessage: string) => {
    try {
        const data = await response.json();
        if (typeof data?.error === 'string' && data.error.trim()) {
            return data.error;
        }
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCurrentUser = useCallback(async (): Promise<User | null> => {
        try {
            const response = await apiFetch('/api/auth/me', { includeCredentials: true });
            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.user ? normalizeUser(data.user) : null;
        } catch (err) {
            console.error('Fetch me error:', err);
            return null;
        }
    }, []);

    const fetchMe = useCallback(async () => {
        try {
            const nextUser = await loadCurrentUser();
            if (nextUser) {
                console.log('DEBUG [AuthContext]: User data fetched:', nextUser);
            }
            setUser(nextUser);
        } finally {
            setLoading(false);
        }
    }, [loadCurrentUser]);

    const syncUserFromResponse = useCallback(async (response: Response, source: 'login' | 'register' | 'profile') => {
        const nextUser = await readUserFromResponse(response, source);

        if (nextUser) {
            setUser(nextUser);
            return;
        }

        await fetchMe();
    }, [fetchMe]);

    useEffect(() => {
        void fetchMe();
    }, [fetchMe]);

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
                await syncUserFromResponse(response, 'login');
                return true;
            } else {
                const errorMsg = await getAuthErrorMessage(response, getLoginFallbackMessage(response.status));
                console.log('[AuthContext] Login failed:', errorMsg);
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

    const register = async (email: string, password: string, role: User['role'], fullName: string, zone: string, phone?: string, bio?: string, interests?: string[]) => {
        setError(null);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const response = await apiFetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password, role, fullName, zone, phone, bio, interests }),
                includeCredentials: true
            });
            if (response.ok) {
                await syncUserFromResponse(response, 'register');
                return true;
            } else {
                const errorMsg = await getAuthErrorMessage(response, getRegisterFallbackMessage(response.status));
                setError(errorMsg);
                return false;
            }
        } catch (err) {
            console.error('[AuthContext] Register error:', err);
            setError(err instanceof Error ? err.message : 'No pudimos conectarnos con el servidor. Intentá de nuevo.');
            return false;
        }
    };

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
                await syncUserFromResponse(response, 'profile');
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
        } catch (err) {
            console.error('[AuthContext] Logout error:', err);
            setError('No pudimos cerrar tu sesión. Intentá de nuevo.');
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user), error, login, logout, register, refresh: fetchMe, updateProfile, clearError }}>
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
