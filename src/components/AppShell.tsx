import React, { Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

type AppShellProps = {
  children: React.ReactNode;
};

type NavAction = {
  label: string;
  shortLabel: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  protected?: boolean;
  onClick?: () => void;
  badge?: number;
  badgeLabel?: (count: number) => string;
};

const matchesPath = (pathname: string, target: string) => {
  if (target === '/') return pathname === '/' || pathname.startsWith('/explore');
  return pathname === target || pathname.startsWith(`${target}/`);
};

const getNavAriaLabel = (action: NavAction) => {
  if (!action.badge) {
    return action.label;
  }

  if (action.badgeLabel) {
    return `${action.label}, ${action.badgeLabel(action.badge)}`;
  }

  return `${action.label}, ${action.badge} ${action.badge === 1 ? 'elemento guardado' : 'elementos guardados'}`;
};

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
  '/faq'
];

const hiddenMobileNavPrefixes = [
  '/login',
  '/register',
  '/verify',
  '/verification',
  '/chat',
  '/about',
  '/faq',
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

const DesktopNavButton = ({ action, active, onSelect }: { action: NavAction; active: boolean; onSelect: (action: NavAction) => void; }) => (
  <button
    type="button"
    onClick={() => onSelect(action)}
    aria-label={getNavAriaLabel(action)}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'app-nav-link relative',
      active && 'app-nav-link-active'
    )}
  >
    <action.icon className="h-4 w-4" />
    <span>{action.label}</span>
    {action.badge ? (
      <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
        {action.badge}
      </span>
    ) : null}
  </button>
);

const MobileNavButton = ({ action, active, onSelect }: { action: NavAction; active: boolean; onSelect: (action: NavAction) => void; }) => (
  <button
    type="button"
    onClick={() => onSelect(action)}
    aria-label={getNavAriaLabel(action)}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[20px] border px-2.5 py-2.5 text-[11px] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-150',
      active ? 'border-slate-900 bg-slate-950 text-white shadow-[0_18px_32px_-24px_rgba(15,23,42,0.42)]' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900'
    )}
  >
    <action.icon className="h-5 w-5" />
    <span className="truncate">{action.shortLabel}</span>
    {action.badge ? (
      <span aria-hidden="true" className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
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
          <div className="app-page flex items-center justify-between gap-2 py-3 sm:gap-4 sm:py-4">
            <button type="button" onClick={() => navigate('/')} aria-label="Ir al inicio de Alquiler Real" className="flex min-w-0 items-center gap-2 rounded-full pr-1 transition-transform duration-200 hover:scale-[1.01] sm:gap-3 sm:pr-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_35px_-22px_rgba(15,23,42,0.85)] sm:h-11 sm:w-11">
                <Icons.ShieldCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0 text-left">
                <div className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-brand sm:block">Información real</div>
                <div className="font-display truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-[1.2rem]">Alquiler Real</div>
              </div>
            </button>

            <nav aria-label="Navegación principal" className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/92 p-1.5 shadow-[0_20px_36px_-28px_rgba(15,23,42,0.24)] lg:flex">
              {desktopActions.map((action) => (
                <DesktopNavButton
                  key={action.label}
                  action={action}
                  active={!!action.path && matchesPath(location.pathname, action.path)}
                  onSelect={onSelect}
                />
              ))}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
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
                    className="app-icon-button hidden md:inline-flex"
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
                  <button type="button" onClick={() => openLoginModal()} className="app-button-secondary hidden md:inline-flex">
                    <Icons.User className="h-4 w-4" />
                    Ingresá
                  </button>
                  <button type="button" onClick={() => navigate('/register')} className="app-button-primary px-4 sm:px-5">
                    <Icons.ArrowRight className="h-4 w-4" />
                    Creá tu cuenta
                  </button>
                </>
              ) : hasSessionError ? (
                <button type="button" onClick={() => void refresh()} className="app-button-secondary hidden md:inline-flex">
                  <Icons.AlertTriangle className="h-4 w-4" />
                  Reintentar sesión
                </button>
              ) : (
                <div role="status" aria-live="polite" className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white/96 px-4 py-2 text-sm font-semibold text-slate-500 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.24)] md:inline-flex">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  Verificando sesión...
                </div>
              )}
            </div>
          </div>
        </header>
      ) : null}

      <div className={cn('min-h-screen', showMobileNav ? 'pb-[calc(env(safe-area-inset-bottom)+5.75rem)] md:pb-10' : '')}>{children}</div>

      {showMobileNav ? (
        <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 md:hidden">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-t-[30px] border border-b-0 border-slate-200/90 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 shadow-[0_-18px_40px_-30px_rgba(15,23,42,0.28)] backdrop-blur-none">
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
