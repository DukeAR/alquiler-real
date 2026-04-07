import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type UserMode } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Button } from './Button';

type AccountModeSwitchProps = {
  className?: string;
  compact?: boolean;
};

const labels: Record<UserMode, string> = {
  guest: 'Modo huésped',
  host: 'Modo anfitrión',
};

export const AccountModeSwitch = ({ className, compact = false }: AccountModeSwitchProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setActiveMode } = useAuth();
  const [pendingMode, setPendingMode] = useState<UserMode | null>(null);

  if (!user) {
    return null;
  }

  const currentMode: UserMode = user.activeMode === 'host' ? 'host' : 'guest';

  const handleModeChange = async (nextMode: UserMode) => {
    if (pendingMode) {
      return;
    }

    if (nextMode === currentMode) {
      if (nextMode === 'host' && location.pathname !== '/host-dashboard') {
        navigate('/host-dashboard');
      }

      if (nextMode === 'guest' && location.pathname.startsWith('/host-dashboard')) {
        navigate('/');
      }

      return;
    }

    setPendingMode(nextMode);
    const success = await setActiveMode(nextMode);
    setPendingMode(null);

    if (!success) {
      return;
    }

    if (nextMode === 'host') {
      navigate('/host-dashboard');
      return;
    }

    if (location.pathname.startsWith('/host-dashboard')) {
      navigate('/');
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 p-1 shadow-[var(--app-shadow-subtle)] dark:border-slate-700 dark:bg-slate-900/95',
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
      aria-label="Selector de modo de cuenta"
    >
      {(['guest', 'host'] as const).map((mode) => {
        const isActive = currentMode === mode;
        const isLoading = pendingMode === mode;

        return (
          <Button
            key={mode}
            type="button"
            variant={isActive ? 'primary' : 'ghost'}
            size={compact ? 'sm' : 'md'}
            loading={isLoading}
            loadingLabel={compact ? (mode === 'guest' ? 'Huésped' : 'Anfitrión') : labels[mode]}
            className={cn(
              'rounded-full px-3',
              !isActive && 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50',
            )}
            onClick={() => {
              void handleModeChange(mode);
            }}
          >
            {compact ? (mode === 'guest' ? 'Huésped' : 'Anfitrión') : labels[mode]}
          </Button>
        );
      })}
    </div>
  );
};

export default AccountModeSwitch;