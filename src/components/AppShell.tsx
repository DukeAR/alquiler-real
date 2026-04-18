import React, { Suspense, useEffect, useState } from 'react';
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
  desktopStyle?: 'default' | 'soft-pill';
  desktopProminent?: boolean;
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
  '/detail',
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

const getDesktopNavItemClassName = (
  active: boolean,
  inverted = false,
  style: NavAction['desktopStyle'] = 'default',
  prominent = false,
) => {
  if (style === 'soft-pill') {
    return cn(
      'group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow] duration-150',
      inverted
        ? active
          ? 'border-white/28 bg-white/16 text-brand-light shadow-[0_18px_34px_-28px_rgba(0,0,0,0.34)] backdrop-blur-[10px]'
          : prominent
            ? 'border-white/24 bg-white/14 text-white shadow-[0_14px_28px_-28px_rgba(0,0,0,0.28)] backdrop-blur-[10px] hover:border-white/30 hover:bg-white/20 hover:text-white'
            : 'border-white/18 bg-white/10 text-white/84 backdrop-blur-[10px] hover:border-white/24 hover:bg-white/16 hover:text-white'
        : active
          ? 'border-brand/20 bg-brand/[0.06] text-brand shadow-[0_18px_34px_-28px_rgba(15,23,42,0.24)]'
          : prominent
            ? 'border-[rgba(15,23,42,0.1)] bg-[rgba(248,250,252,0.96)] text-slate-900 shadow-[0_14px_28px_-28px_rgba(15,23,42,0.18)] hover:border-[rgba(15,23,42,0.14)] hover:bg-white hover:text-slate-950'
            : 'border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] text-slate-900 hover:border-[rgba(15,23,42,0.12)] hover:bg-[rgba(255,255,255,0.92)] hover:text-slate-950',
    );
  }

  return cn(
    'group relative inline-flex items-center gap-2 px-0 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] transition-[color] duration-150',
    'after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:transition-transform after:duration-150 hover:after:scale-x-100',
    inverted
      ? 'text-white/78 hover:text-white after:bg-white/38'
      : 'text-slate-600 hover:text-slate-950 after:bg-slate-300',
    active && (inverted ? 'text-white after:scale-x-100 after:bg-white' : 'text-slate-950 after:scale-x-100 after:bg-brand'),
  );
};

const getDesktopNavIconClassName = (
  active: boolean,
  inverted = false,
  style: NavAction['desktopStyle'] = 'default',
  prominent = false,
) => {
  if (style === 'soft-pill') {
    return cn(
      'h-4 w-4 transition-colors duration-150',
      inverted
        ? active
          ? 'text-brand-light'
          : prominent
            ? 'text-brand-light/95 group-hover:text-brand-light'
            : 'text-brand-light/90 group-hover:text-brand-light'
        : active
          ? 'text-brand'
          : prominent
            ? 'text-brand group-hover:text-brand-dark'
            : 'text-brand group-hover:text-brand-dark',
    );
  }

  return cn(
    'h-4 w-4 transition-colors duration-150',
    inverted
      ? active ? 'text-white' : 'text-white/70 group-hover:text-white/92'
      : active ? 'text-brand' : 'text-slate-400 group-hover:text-slate-500',
  );
};

const DesktopNavButton = ({ action, active, inverted = false, onSelect }: { action: NavAction; active: boolean; inverted?: boolean; onSelect: (action: NavAction) => void; }) => (
  action.path && !action.onClick && !action.protected ? (
    <Link
      to={action.path}
      aria-label={getNavAriaLabel(action)}
      aria-current={active ? 'page' : undefined}
      className={getDesktopNavItemClassName(active, inverted, action.desktopStyle, action.desktopProminent)}
    >
      <action.icon className={getDesktopNavIconClassName(active, inverted, action.desktopStyle, action.desktopProminent)} />
      <span>{action.label}</span>
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => onSelect(action)}
      aria-label={getNavAriaLabel(action)}
      aria-current={active ? 'page' : undefined}
      className={getDesktopNavItemClassName(active, inverted, action.desktopStyle, action.desktopProminent)}
    >
      <action.icon className={getDesktopNavIconClassName(active, inverted, action.desktopStyle, action.desktopProminent)} />
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

  const isPropertyDetailRoute = matchesPath(location.pathname, '/detail');
  const [isPropertyHeroVisible, setIsPropertyHeroVisible] = useState(() => isPropertyDetailRoute);

  useEffect(() => {
    if (!isPropertyDetailRoute) {
      setIsPropertyHeroVisible(false);
      return;
    }

    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;

    const updateHeroVisibility = () => {
      const heroElement = document.querySelector('[data-property-detail-hero]');
      const headerElement = document.querySelector('.app-header');
      const headerHeight = headerElement instanceof HTMLElement ? headerElement.offsetHeight : 0;

      if (!(heroElement instanceof HTMLElement)) {
        setIsPropertyHeroVisible(window.scrollY <= 24);
        return;
      }

      const heroBounds = heroElement.getBoundingClientRect();
      setIsPropertyHeroVisible(heroBounds.bottom > headerHeight + 24);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateHeroVisibility);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    const heroElement = document.querySelector('[data-property-detail-hero]');
    if (typeof ResizeObserver !== 'undefined' && heroElement instanceof HTMLElement) {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate();
      });
      resizeObserver.observe(heroElement);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [isPropertyDetailRoute, location.pathname]);

  const showHeader = !hiddenHeaderPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const showMobileNav = !hiddenMobileNavPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const showAssistant = !hiddenAssistantPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const usesExploreLayoutWidth = location.pathname === '/' || matchesPath(location.pathname, '/explore');
  const headerLayoutClass = usesExploreLayoutWidth ? 'app-page-explore' : 'app-page';
  const headerOnHero = isPropertyDetailRoute && isPropertyHeroVisible;

  const desktopActions: NavAction[] = [
    { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search, desktopStyle: 'soft-pill', desktopProminent: true },
    ...(isAuthenticated ? [favoritesAction] : []),
    { label: 'Cómo funciona', shortLabel: 'Cómo', path: '/about', icon: Icons.Info, desktopStyle: 'soft-pill' },
    { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb, desktopStyle: 'soft-pill' }
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
        <header className={cn('app-header z-50', isPropertyDetailRoute ? 'app-header-detail' : 'relative', headerOnHero && 'app-header-on-hero')}>
          <div className={cn(headerLayoutClass, 'flex items-center gap-4 py-3.5 sm:gap-7 sm:py-5 lg:gap-5 xl:gap-6')}>
            <button type="button" onClick={() => navigate('/')} aria-label="Ir al inicio de Alquiler Real" className="flex shrink-0 items-center gap-3.5 rounded-2xl pr-0 transition-opacity duration-200 hover:opacity-95 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] sm:gap-4">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-[1rem] border transition-[border-color,background-color,color,box-shadow] duration-200 sm:h-10 sm:w-10',
                headerOnHero
                  ? 'border-white/18 bg-white/8 text-white shadow-[0_18px_40px_-30px_rgba(0,0,0,0.42)] backdrop-blur-[10px]'
                  : 'border-slate-200/90 bg-slate-50 text-slate-500 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.22)]',
              )}>
                <Icons.ShieldCheck className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" />
              </div>
              <div className="text-left">
                <div className={cn('hidden text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 sm:block', headerOnHero ? 'text-white/62' : 'text-slate-400/80')}>Información real</div>
                <div className={cn('font-display whitespace-nowrap text-[1.08rem] font-semibold leading-none tracking-[-0.03em] transition-colors duration-200 sm:text-[1.34rem]', headerOnHero ? 'text-white' : 'text-slate-950')}>
                  <span className={cn('transition-colors duration-200', headerOnHero ? 'text-white' : 'text-slate-950')}>Alquiler</span>{' '}
                  <span className={cn('transition-colors duration-200', headerOnHero ? 'text-white' : 'text-brand')}>Real</span>
                </div>
              </div>
            </button>

            <nav aria-label="Navegación principal" className="hidden items-center gap-5 lg:ml-auto lg:flex xl:gap-6">
              {desktopActions.map((action) => (
                <DesktopNavButton
                  key={action.label}
                  action={action}
                  active={!!action.path && matchesPath(location.pathname, action.path)}
                  inverted={headerOnHero}
                  onSelect={onSelect}
                />
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-4 lg:gap-5 xl:gap-6">
              {isAuthenticated && user ? <AccountModeSwitch className="hidden lg:inline-flex" compact /> : null}

              {isAuthenticated && user ? (
                <NotificationsMenu
                  status={notifications.status}
                  notifications={notifications.notifications}
                  unreadCount={notifications.unreadCount}
                  errorMessage={notifications.errorMessage}
                  isMarkingAllRead={notifications.isMarkingAllRead}
                  onRefresh={notifications.loadNotifications}
                  onMarkAllAsRead={notifications.markAllAsRead}
                  onLoginRequired={openLoginModal}
                  inverted={headerOnHero}
                />
              ) : null}

              {isAuthenticated && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/my-bookings')}
                    className={cn(
                      'hidden h-9 w-9 items-center justify-center rounded-xl transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:inline-flex sm:h-10 sm:w-10',
                      headerOnHero
                        ? 'text-white/84 hover:bg-white/10 hover:text-white'
                        : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900',
                    )}
                    aria-label="Mis reservas"
                  >
                    <Icons.Calendar className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className={cn(
                      'flex items-center gap-3 rounded-full px-2 py-2 transition-[background-color,border-color,box-shadow,transform,color] duration-200',
                      headerOnHero
                        ? 'border border-white/18 bg-black/18 text-white shadow-[0_18px_35px_-28px_rgba(0,0,0,0.32)] backdrop-blur-[10px] hover:border-white/26 hover:bg-black/28 hover:shadow-[0_22px_40px_-28px_rgba(0,0,0,0.34)]'
                        : 'border border-slate-200/90 bg-white/96 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.24)] hover:border-slate-300 hover:bg-white hover:shadow-[0_22px_40px_-28px_rgba(15,23,42,0.24)]',
                    )}
                    aria-label="Ir al perfil"
                  >
                    <div className="hidden text-right md:block">
                      <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', headerOnHero ? 'text-white/62' : 'text-slate-400')}>Cuenta</div>
                      <div className={cn('text-sm font-bold', headerOnHero ? 'text-white' : 'text-slate-900')}>{user.name}</div>
                    </div>
                    <div className={cn('h-10 w-10 overflow-hidden rounded-full', headerOnHero ? 'bg-white/16' : 'bg-slate-100')}>
                      <img src={user.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} className="h-full w-full object-cover" />
                    </div>
                  </button>
                </>
              ) : isUnauthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => openLoginModal()}
                    className={cn(
                      'hidden shrink-0 items-center rounded-full border px-4 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:inline-flex',
                      headerOnHero
                        ? 'border-white/18 bg-white/10 text-white/92 backdrop-blur-[10px] hover:border-white/24 hover:bg-white/16 hover:text-white'
                        : 'border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] text-slate-900 hover:border-[rgba(15,23,42,0.12)] hover:bg-[rgba(255,255,255,0.92)] hover:text-slate-950',
                    )}
                  >
                    Ingresá
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className={cn(
                      'app-button-primary h-10 whitespace-nowrap rounded-[1rem] px-4 text-[0.9rem] sm:h-11 sm:px-6 sm:text-[0.96rem]',
                      headerOnHero ? 'shadow-[0_22px_42px_-26px_rgba(15,23,42,0.48)]' : 'shadow-[0_20px_38px_-26px_rgba(55,48,163,0.52)]',
                    )}
                  >
                    Publicar propiedad
                    <Icons.ArrowRight className="hidden h-4 w-4 sm:block" />
                  </button>
                </>
              ) : hasSessionError ? (
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center transition-[border-color,color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5',
                    headerOnHero
                      ? 'rounded-full border border-white/18 bg-black/18 text-white shadow-[0_16px_34px_-28px_rgba(0,0,0,0.32)] backdrop-blur-[10px] hover:border-white/26 hover:bg-black/28 hover:text-white md:rounded-[0.95rem] md:shadow-[0_16px_34px_-28px_rgba(0,0,0,0.32)]'
                      : 'rounded-full border border-slate-200/85 bg-white/88 text-slate-600 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.24)] hover:border-slate-300 hover:bg-white hover:text-slate-950 md:rounded-[0.95rem] md:bg-white/70 md:shadow-none',
                  )}
                >
                  <Icons.AlertTriangle className="h-4 w-4" />
                  <span className="hidden md:inline">Reintentar sesión</span>
                </button>
              ) : (
                <div role="status" aria-live="polite" className={cn(
                  'inline-flex h-10 w-10 items-center justify-center md:h-auto md:w-auto md:gap-2 md:px-0 md:py-0',
                  headerOnHero
                    ? 'rounded-full border border-white/16 bg-black/18 text-white/84 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.28)] backdrop-blur-[10px] md:rounded-none md:border-transparent md:bg-transparent md:shadow-none'
                    : 'rounded-full border border-slate-200/80 bg-white/88 text-slate-500 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18)] md:rounded-none md:border-transparent md:bg-transparent md:shadow-none',
                )}>
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
