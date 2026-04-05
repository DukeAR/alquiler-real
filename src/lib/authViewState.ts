import type { AuthStatus, User } from '../hooks/useAuth';

export type ResolvedAuthViewState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type AuthViewInput = {
  user: User | null;
  loading: boolean;
  status: AuthStatus;
};

export const getResolvedAuthViewState = ({ user, loading, status }: AuthViewInput): ResolvedAuthViewState => {
  if (loading || status === 'loading') {
    return 'loading';
  }

  if (user) {
    return 'authenticated';
  }

  if (status === 'error') {
    return 'error';
  }

  if (status === 'unauthenticated') {
    return 'unauthenticated';
  }

  return 'loading';
};