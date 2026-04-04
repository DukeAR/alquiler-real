import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading, status, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <LoadingState
        compact
        message="Verificando tu sesión..."
        description="Un momento mientras confirmamos tu acceso a esta sección."
      />
    );
  }

  if (status === 'error' && !user) {
    return (
      <ErrorState
        title="No pudimos verificar tu sesión"
        description="Reintentá para volver a cargar tu cuenta antes de entrar a esta sección."
        onRetry={() => void refresh()}
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export const RequireRole = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: Array<'tenant' | 'host'> }) => {
  const { user, loading, status, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <LoadingState
        compact
        message="Verificando tu sesión..."
        description="Un momento mientras confirmamos tu acceso a esta sección."
      />
    );
  }

  if (status === 'error' && !user) {
    return (
      <ErrorState
        title="No pudimos verificar tu sesión"
        description="Reintentá para volver a cargar tu cuenta antes de entrar a esta sección."
        onRetry={() => void refresh()}
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};