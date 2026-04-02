import { useAuthContext } from '../contexts/AuthContext';

export type { User } from '../contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}
