import React, { Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { NotificationToast } from './NotificationToast';
import { AIAssistant } from './AIAssistant';
import { NotificationsMenu } from './NotificationsMenu';
import { AccountModeSwitch } from './ui/AccountModeSwitch';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useNotifications } from '../hooks/useNotifications';
import { useSocket } from '../hooks/useSocket';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';
import { getResolvedAuthViewState } from '../lib/authViewState';

// --- Types and Utility Functions (local definitions) ---
export type NavAction = {
  label: string;
  shortLabel: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeLabel?: (count: number) => string;
  protected?: boolean;
  onClick?: () => void;
};

export interface AppShellProps {
  children: React.ReactNode;
}

function matchesPath(pathname: string, prefix: string): boolean {
  // Simple prefix match, can be improved for more complex routing
  return pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?');
}

function getNavAriaLabel(action: NavAction): string {
  if (action.badge && typeof action.badge === 'number' && action.badgeLabel) {
    return `${action.label} (${action.badgeLabel(action.badge)})`;
  }
  return action.label;
}

const hiddenHeaderPrefixes = [
  '/login',
  '/register',
  '/verify',
  '/verification',
  '/chat',
  '/profile',
  '/edit-profile',
  '/change-password',
  '/my-bookings',
  '/host-dashboard',
  '/tenant-profile',
  '/host',
  '/about',
  '/faq',
  '/terms'
];

const hiddenMobileNavPrefixes = [
  '/login',
  '/register',
  '/verify',
  '/verification',
  '/chat',
  '/about',
  '/faq',
  '/terms',
  '/edit-profile',
  '/change-password',
  '/host-dashboard',
  '/tenant-profile',
  '/host'
];

const hiddenAssistantPrefixes = ['/login', '/register', '/verify', '/verification', '/chat'];

const openLoginModal = async () => {
  const modal = await import('../lib/modal');
  modal.showLoginModal();
};

const LazyLoginModal = React.lazy(() => import('./LoginModal'));

const getDesktopNavItemClassName = (active: boolean) => cn(
  'group relative inline-flex items-center gap-2 px-0 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] text-slate-600 transition-[color] duration-150 hover:text-slate-950',
  'after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-slate-300 after:transition-transform after:duration-150 hover:after:scale-x-100',
  active && 'text-slate-950 after:scale-x-100 after:bg-brand',
);

const DesktopNavButton = ({ action, active, onSelect }: { action: NavAction; active: boolean; onSelect: (action: NavAction) => void; }) => (
  action.path && !action.onClick && !action.protected ? (
    <Link
      to={action.path}
      aria-label={getNavAriaLabel(action)}
      aria-current={active ? 'page' : undefined}
      className={getDesktopNavItemClassName(active)}
    >
      <action.icon className={cn('h-4 w-4 transition-colors duration-150', active ? 'text-brand' : 'text-slate-400 group-hover:text-slate-500')} />
      <span>{action.label}</span>
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => onSelect(action)}
      aria-label={getNavAriaLabel(action)}
      aria-current={active ? 'page' : undefined}
      className={getDesktopNavItemClassName(active)}
    >
      <action.icon className={cn('h-4 w-4 transition-colors duration-150', active ? 'text-brand' : 'text-slate-400 group-hover:text-slate-500')} />
      <span>{action.label}</span>
      {action.badge ? (
        <span aria-hidden="true" className="absolute -right-3 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
          {action.badge}
        </span>
      ) : null}
    </button>
  )
);

const MobileNavButton = ({ action, active, onSelect }: { action: NavAction; active: boolean; onSelect: (action: NavAction) => void; }) => (
  <button
    type="button"
    onClick={() => onSelect(action)}
    aria-label={getNavAriaLabel(action)}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'group relative flex min-w-0 flex-1 flex-col items-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold tracking-[0.01em] transition-[color,transform] duration-150',
      active ? 'text-slate-950' : 'text-slate-500 hover:text-slate-900'
    )}
  >
    <span
      aria-hidden="true"
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-150',
        active
          ? 'bg-slate-100 text-slate-950 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)]'
          : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-700'
      )}
    >
      <action.icon className="h-5 w-5" />
    </span>
    <span className="truncate">{action.shortLabel}</span>
    <span
      aria-hidden="true"
      className={cn(
        'h-1 w-6 rounded-full transition-colors duration-150',
        active ? 'bg-brand/75' : 'bg-transparent group-hover:bg-slate-200'
      )}
    />
    {action.badge ? (
      <span aria-hidden="true" className="absolute right-[calc(50%-1.4rem)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-[0_8px_18px_-10px_rgba(239,68,68,0.7)]">
        {action.badge}
      </span>
    ) : null}
  </button>
);

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, status: authStatus, refresh } = useAuth();
  const { getUnseenFavoritesCount, markFavoritesAsSeen } = useFavorites();
  const notifications = useNotifications();
  const authViewState = getResolvedAuthViewState({ user, loading: authLoading, status: authStatus });
  const isAuthenticated = authViewState === 'authenticated' && Boolean(user);
  const isUnauthenticated = authViewState === 'unauthenticated';
  const hasSessionError = authViewState === 'error';
  const favoritesAction: NavAction = {
    label: 'Guardados',
    shortLabel: 'Guardados',
    path: '/favorites',
    protected: true,
    icon: Icons.Heart,
    badge: getUnseenFavoritesCount(),
    badgeLabel: (count) => `${count} ${count === 1 ? 'guardado nuevo' : 'guardados nuevos'}`,
  };

  useSocket();

  const promptAuth = async (message: string) => {
    showToast('Necesitás iniciar sesión', message, 'warning');
    await openLoginModal();
  };

  const onSelect = async (action: NavAction) => {
    if (action.onClick) {
      action.onClick();
      return;
    }

    if (!action.path) return;

    if (authViewState === 'loading') {
      return;
    }

    if (action.protected && hasSessionError) {
      showToast('No pudimos verificar tu sesión', 'Reintentá antes de entrar a esta sección.', 'error');
      void refresh();
      return;
    }

    if (action.protected && authViewState !== 'authenticated') {
      await promptAuth('Iniciá sesión para entrar a esta sección.');
      return;
    }

    if (action.path === '/favorites') {
      markFavoritesAsSeen();
    }

    navigate(action.path);
  };

  const showHeader = !hiddenHeaderPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const showMobileNav = !hiddenMobileNavPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const showAssistant = !hiddenAssistantPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const usesExploreLayoutWidth = location.pathname === '/' || matchesPath(location.pathname, '/explore');
  const headerLayoutClass = usesExploreLayoutWidth ? 'app-page-explore' : 'app-page';

  const desktopActions: NavAction[] = [
    { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
    ...(isAuthenticated ? [favoritesAction] : []),
    { label: 'Cómo funciona', shortLabel: 'Cómo', path: '/about', icon: Icons.Info },
    { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb }
  ];

  const mobileActions: NavAction[] = isAuthenticated
    ? [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        favoritesAction,
        { label: 'Reservas', shortLabel: 'Reservas', path: '/my-bookings', protected: true, icon: Icons.Calendar },
        { label: 'Perfil', shortLabel: 'Perfil', path: '/profile', protected: true, icon: Icons.User }
      ]
    : isUnauthenticated
      ? [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb },
        { label: 'Ingresá', shortLabel: 'Ingresá', onClick: () => { openLoginModal(); }, icon: Icons.User }
      ]
      : [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb }
      ];

  return (
    <div className="app-shell">
      <NotificationToast />
      <Suspense fallback={null}>
        <LazyLoginModal />
      </Suspense>

      {showHeader ? (
        <header className="app-header relative z-50">
          <div className={cn(headerLayoutClass, 'flex items-center justify-between gap-3 py-3.5 sm:gap-6 sm:py-4.5')}>
            <button type="button" onClick={() => navigate('/')} aria-label="Ir al inicio de Alquiler Real" className="flex min-w-0 items-center gap-2 rounded-full pr-1 transition-transform duration-200 hover:scale-[1.01] sm:gap-3 sm:pr-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_35px_-22px_rgba(15,23,42,0.85)] sm:h-11 sm:w-11">
                <Icons.ShieldCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0 text-left">
                <div className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-brand sm:block">Información real</div>
                <div className="font-display truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-[1.2rem]">Alquiler Real</div>
              </div>
            </button>

            <nav aria-label="Navegación principal" className="hidden items-center gap-6 lg:flex lg:flex-1 lg:justify-center xl:gap-8">
              {desktopActions.map((action) => (
                <DesktopNavButton
                  key={action.label}
                  action={action}
                  active={!!action.path && matchesPath(location.pathname, action.path)}
                  onSelect={onSelect}
                />
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3.5">
              {isAuthenticated && user ? <AccountModeSwitch className="hidden lg:inline-flex" compact /> : null}

              <NotificationsMenu
                status={notifications.status}
                notifications={notifications.notifications}
                unreadCount={notifications.unreadCount}
                errorMessage={notifications.errorMessage}
                isMarkingAllRead={notifications.isMarkingAllRead}
                onRefresh={notifications.loadNotifications}
                onMarkAllAsRead={notifications.markAllAsRead}
                onLoginRequired={openLoginModal}
              />

              {isAuthenticated && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/my-bookings')}
                    className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-[color,background-color] duration-150 hover:bg-slate-100/80 hover:text-slate-950 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:inline-flex"
                    aria-label="Mis reservas"
                  >
                    <Icons.Calendar className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-3 rounded-full border border-slate-200/90 bg-white/96 px-2 py-2 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.24)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-slate-300 hover:bg-white hover:shadow-[0_22px_40px_-28px_rgba(15,23,42,0.24)]"
                    aria-label="Ir al perfil"
                  >
                    <div className="hidden text-right md:block">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Cuenta</div>
                      <div className="text-sm font-bold text-slate-900">{user.name}</div>
                    </div>
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                      <img src={user.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} className="h-full w-full object-cover" />
                    </div>
                  </button>
                </>
              ) : isUnauthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => openLoginModal()}
                    className="hidden items-center gap-2 px-0 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] text-slate-600 transition-[color,text-decoration-color] duration-150 hover:text-slate-950 hover:underline hover:decoration-slate-300 hover:underline-offset-4 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:inline-flex"
                  >
                    <Icons.User className="h-4 w-4" />
                    Ingresá
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="app-button-primary h-10 rounded-[0.95rem] px-4 text-[0.95rem] shadow-[0_18px_36px_-28px_rgba(79,70,229,0.78)] sm:h-11 sm:rounded-[1rem] sm:px-6"
                  >
                    <Icons.ArrowRight className="h-4 w-4" />
                    Creá tu cuenta
                  </button>
                </>
              ) : hasSessionError ? (
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/85 bg-white/88 text-slate-600 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.24)] transition-[border-color,color,background-color,box-shadow] duration-150 hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:h-auto md:w-auto md:gap-2 md:rounded-[0.95rem] md:bg-white/70 md:px-4 md:py-2.5 md:shadow-none"
                >
                  <Icons.AlertTriangle className="h-4 w-4" />
                  <span className="hidden md:inline">Reintentar sesión</span>
                </button>
              ) : (
                <div role="status" aria-live="polite" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/88 text-slate-500 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18)] md:h-auto md:w-auto md:gap-2 md:rounded-none md:border-transparent md:bg-transparent md:px-0 md:py-0 md:shadow-none">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden md:inline">Verificando sesión...</span>
                </div>
              )}
            </div>
          </div>
        </header>
      ) : null}

      <div className={cn('min-h-screen', showMobileNav ? 'pb-[calc(env(safe-area-inset-bottom)+5.75rem)] md:pb-10' : '')}>{children}</div>

      {showMobileNav ? (
        <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 md:hidden">
          <div className="mx-auto flex max-w-md items-center gap-1 rounded-t-[30px] border border-b-0 border-slate-200/85 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 shadow-[0_-18px_40px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl">
            {mobileActions.map((action) => (
              <MobileNavButton
                key={action.label}
                action={action}
                active={!!action.path && matchesPath(location.pathname, action.path)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </nav>
      ) : null}

      {showAssistant ? <AIAssistant /> : null}
    </div>
  );
};

export default AppShell;
