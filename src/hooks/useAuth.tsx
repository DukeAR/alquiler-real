import { useAuthContext } from '../contexts/AuthContext';

export type { AuthRefreshResult, AuthStatus, User } from '../contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}
