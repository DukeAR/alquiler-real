import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { getResolvedAuthViewState } from '../../lib/authViewState';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading, status, refresh } = useAuth();
  const location = useLocation();
  const authViewState = getResolvedAuthViewState({ user, loading, status });

  if (authViewState === 'loading') {
    return (
      <LoadingState
        compact
        message="Verificando tu sesión..."
        description="Un momento mientras confirmamos tu acceso a esta sección."
      />
    );
  }

  if (authViewState === 'error') {
    return (
      <ErrorState
        title="No pudimos verificar tu sesión"
        description="Reintentá para volver a cargar tu cuenta antes de entrar a esta sección."
        onRetry={() => void refresh()}
      />
    );
  }

  if (authViewState !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export const RequireRole = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: Array<'tenant' | 'host' | 'internal_ops'> }) => {
  const { user, loading, status, refresh } = useAuth();
  const location = useLocation();
  const authViewState = getResolvedAuthViewState({ user, loading, status });

  if (authViewState === 'loading') {
    return (
      <LoadingState
        compact
        message="Verificando tu sesión..."
        description="Un momento mientras confirmamos tu acceso a esta sección."
      />
    );
  }

  if (authViewState === 'error') {
    return (
      <ErrorState
        title="No pudimos verificar tu sesión"
        description="Reintentá para volver a cargar tu cuenta antes de entrar a esta sección."
        onRetry={() => void refresh()}
      />
    );
  }

  if (authViewState !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const canAccess = allowedRoles.some((role) => {
    if (role === 'internal_ops') {
      return Boolean(user.canInternalOps);
    }

    if (role === 'host') {
      return user.canHost || user.activeMode === 'host' || user.role === 'host';
    }

    return user.canGuest;
  });

  if (!canAccess) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};