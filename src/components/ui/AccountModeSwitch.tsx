import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type UserMode } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Button } from './Button';

type AccountModeSwitchProps = {
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  activeButtonClassName?: string;
  inactiveButtonClassName?: string;
};

const labels: Record<UserMode, string> = {
  guest: 'Modo huésped',
  host: 'Modo anfitrión',
};

export const AccountModeSwitch = ({
  className,
  buttonClassName,
  compact = false,
  activeButtonClassName,
  inactiveButtonClassName,
}: AccountModeSwitchProps) => {
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
            aria-pressed={isActive}
            loading={isLoading}
            loadingLabel={compact ? (mode === 'guest' ? 'Huésped' : 'Anfitrión') : labels[mode]}
            className={cn(
              'rounded-full px-3',
              buttonClassName,
              isActive
                ? cn(
                    '!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700 hover:!text-white dark:!border-emerald-500 dark:!bg-emerald-500 dark:hover:!bg-emerald-400 dark:hover:!text-slate-950',
                    activeButtonClassName,
                  )
                : cn('text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50', inactiveButtonClassName),
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