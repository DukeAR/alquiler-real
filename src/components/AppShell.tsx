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

const authGuardedPrefixes = [
  '/favorites',
  '/profile',
  '/edit-profile',
  '/change-password',
  '/verification',
  '/verify',
  '/chat',
  '/my-bookings',
  '/host-dashboard',
  '/tenant-profile',
];

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
      'group relative inline-flex h-[3.25rem] shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border px-[1.4rem] text-[0.98rem] font-semibold tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 sm:h-[3.35rem] sm:px-[1.52rem] sm:text-[1.02rem] lg:h-12 lg:gap-2 lg:px-[1.05rem] lg:text-[0.94rem] xl:h-14 xl:gap-2.5 xl:px-[1.65rem] xl:text-[1.04rem]',
      inverted
        ? active
          ? 'border-white/24 bg-white/18 text-white shadow-[0_18px_34px_-26px_rgba(0,0,0,0.34)] backdrop-blur-[12px]'
          : prominent
            ? 'border-white/16 bg-white/10 text-white shadow-[0_14px_28px_-28px_rgba(0,0,0,0.24)] backdrop-blur-[12px] hover:border-white/24 hover:bg-white/16 hover:text-white hover:shadow-[0_18px_34px_-26px_rgba(0,0,0,0.28)]'
            : 'border-transparent bg-transparent text-white/74 hover:border-white/16 hover:bg-white/10 hover:text-white hover:shadow-[0_18px_34px_-28px_rgba(0,0,0,0.22)]'
        : active
          ? 'border-slate-200/90 bg-white text-slate-950 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.16)]'
          : prominent
            ? 'border-slate-200/90 bg-white/94 text-slate-950 shadow-[0_14px_28px_-28px_rgba(15,23,42,0.14)] hover:border-slate-300 hover:bg-white hover:text-slate-950 hover:shadow-[0_18px_34px_-24px_rgba(15,23,42,0.18)]'
            : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200/80 hover:bg-white/92 hover:text-slate-950 hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)]',
    );
  }

  return cn(
    'group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-0 py-2 text-[0.92rem] font-semibold tracking-[-0.01em] transition-[color,transform] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 lg:gap-1.5 lg:text-[0.9rem] xl:gap-2 xl:text-[0.95rem]',
    'after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100',
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
      'h-[1.05rem] w-[1.05rem] transition-colors duration-150 lg:h-4 lg:w-4 xl:h-[1.1rem] xl:w-[1.1rem]',
      inverted
        ? active
            ? 'text-white'
          : prominent
              ? 'text-white/90 group-hover:text-white'
              : 'text-white/56 group-hover:text-white/90'
        : active
            ? 'text-brand'
          : prominent
              ? 'text-brand group-hover:text-brand-dark'
              : 'text-slate-400 group-hover:text-brand',
    );
  }

  return cn(
    'h-4 w-4 transition-colors duration-150 lg:h-[0.95rem] lg:w-[0.95rem] xl:h-4 xl:w-4',
    inverted
      ? active ? 'text-white' : 'text-white/70 group-hover:text-white/92'
      : active ? 'text-brand' : 'text-slate-400 group-hover:text-slate-500',
  );
};

const DesktopNavButton = ({
  action,
  active,
  inverted = false,
  compactLabels = false,
  onSelect,
}: {
  action: NavAction;
  active: boolean;
  inverted?: boolean;
  compactLabels?: boolean;
  onSelect: (action: NavAction) => void;
}) => (
  action.path && !action.onClick && !action.protected ? (
    <Link
      to={action.path}
      aria-label={getNavAriaLabel(action)}
      aria-current={active ? 'page' : undefined}
      className={getDesktopNavItemClassName(active, inverted, action.desktopStyle, action.desktopProminent)}
    >
      <action.icon className={getDesktopNavIconClassName(active, inverted, action.desktopStyle, action.desktopProminent)} />
      {action.path === '/favorites' ? (
        <span className="hidden xl:inline">{action.label}</span>
      ) : action.shortLabel !== action.label ? (
        compactLabels ? (
          <>
            <span className="hidden min-[1850px]:inline">{action.label}</span>
            <span className="min-[1850px]:hidden">{action.shortLabel}</span>
          </>
        ) : (
          <>
            <span className="hidden xl:inline">{action.label}</span>
            <span className="xl:hidden">{action.shortLabel}</span>
          </>
        )
      ) : (
        <span>{action.label}</span>
      )}
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
      {action.path === '/favorites' ? (
        <span className="hidden xl:inline">{action.label}</span>
      ) : action.shortLabel !== action.label ? (
        compactLabels ? (
          <>
            <span className="hidden min-[1850px]:inline">{action.label}</span>
            <span className="min-[1850px]:hidden">{action.shortLabel}</span>
          </>
        ) : (
          <>
            <span className="hidden xl:inline">{action.label}</span>
            <span className="xl:hidden">{action.shortLabel}</span>
          </>
        )
      ) : (
        <span>{action.label}</span>
      )}
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
  const isAuthGuardedRoute = authGuardedPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const showGuestAuthActions = !user && (isUnauthenticated || (hasSessionError && !isAuthGuardedRoute));
  const favoritesAction: NavAction = {
    label: 'Guardados',
    shortLabel: 'Guardados',
    path: '/favorites',
    protected: true,
    icon: Icons.Heart,
    desktopStyle: 'soft-pill',
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

    if (authViewState === 'loading' && action.protected) {
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
  const useSymmetricGuestHeader = showGuestAuthActions;
  const guestDesktopHeaderPrimaryClass = 'flex min-w-0 flex-1 items-center justify-between gap-6 sm:gap-7 lg:gap-8 xl:gap-10';
  const accountDesktopHeaderPrimaryClass = 'flex min-w-0 flex-1 items-center justify-start gap-5 sm:gap-6 lg:gap-7 xl:gap-8';
  const guestDesktopHeaderNavigationClass = cn(
    'hidden min-w-0 flex-1 items-center justify-between gap-5 rounded-[1.9rem] px-5 py-1.5 lg:flex lg:justify-start lg:gap-3 lg:px-3.5 xl:justify-between xl:gap-6 xl:px-8',
    headerOnHero
      ? 'border border-white/14 bg-black/12 shadow-[0_22px_46px_-36px_rgba(0,0,0,0.46)] backdrop-blur-[14px]'
      : 'border border-slate-200/80 bg-white/72 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.16)] backdrop-blur-[14px]',
  );
  const accountDesktopHeaderNavigationClass = cn(
    'hidden min-w-0 flex-1 items-center justify-start gap-3 rounded-[1.9rem] px-4 py-1.5 lg:flex lg:gap-3 lg:px-3.5 xl:gap-4 xl:px-5',
    headerOnHero
      ? 'border border-white/14 bg-black/12 shadow-[0_22px_46px_-36px_rgba(0,0,0,0.46)] backdrop-blur-[14px]'
      : 'border border-slate-200/80 bg-white/72 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.16)] backdrop-blur-[14px]',
  );
  const guestDesktopActionsClass = 'flex shrink-0 items-center justify-end gap-4 sm:gap-5 lg:pl-3 lg:gap-6 xl:pl-4 xl:gap-7';
  const accountDesktopActionsClass = 'flex shrink-0 items-center justify-end gap-3.5 sm:gap-4.5 lg:pl-3 lg:gap-5 xl:pl-4 xl:gap-6';

  const desktopActions: NavAction[] = [
    { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search, desktopStyle: 'soft-pill', desktopProminent: true },
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
    : showGuestAuthActions
      ? [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb },
        { label: 'Ingresá', shortLabel: 'Ingresá', onClick: () => { openLoginModal(); }, icon: Icons.User }
      ]
      : [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb }
      ];

  const brandHomeButton = (
    <button
      type="button"
      onClick={() => navigate('/')}
      aria-label="Ir al inicio de Alquiler Real"
      className={cn(
        'flex shrink-0 items-center rounded-2xl pr-0 transition-[opacity,transform] duration-200 ease-out hover:-translate-y-px hover:opacity-95 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] motion-reduce:transform-none',
        isPropertyDetailRoute ? 'gap-0' : 'gap-3.5 sm:gap-4 lg:gap-[1.15rem]',
      )}
    >
      {!isPropertyDetailRoute ? (
        <div className={cn(
          'relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center overflow-visible sm:h-[3.35rem] sm:w-[3.35rem] lg:h-14 lg:w-14',
          headerOnHero && 'drop-shadow-[0_16px_28px_rgba(15,23,42,0.22)]',
        )}>
          <img
            src="/verified-presencial-badge3.png"
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 scale-[1.42] object-contain sm:scale-[1.5] lg:scale-[1.62]"
          />
        </div>
      ) : null}
      <div className="flex min-w-max flex-col justify-center text-left">
        <div className={cn('hidden text-[9px] font-bold uppercase leading-none tracking-[0.22em] transition-colors duration-200 sm:block sm:text-[10px]', headerOnHero ? 'text-white/60' : 'text-slate-400/85')}>Información real</div>
        <div className={cn('font-display whitespace-nowrap text-[1.28rem] font-extrabold leading-[0.88] tracking-[-0.045em] transition-colors duration-200 sm:text-[1.6rem] lg:text-[1.72rem] xl:text-[1.92rem]', headerOnHero ? 'text-white' : 'text-slate-950')}>
          <span className={cn('transition-colors duration-200', headerOnHero ? 'text-white' : 'text-slate-950')}>Alquiler</span>{' '}
          <span className={cn('transition-colors duration-200', headerOnHero ? 'text-white' : 'text-brand')}>Real</span>
        </div>
      </div>
    </button>
  );

  const renderDesktopNavigation = (className: string, compactLabels = false) => (
    <nav aria-label="Navegación principal" className={className}>
      {desktopActions.map((action) => (
        <DesktopNavButton
          key={action.label}
          action={action}
          active={!!action.path && matchesPath(location.pathname, action.path)}
          inverted={headerOnHero}
          compactLabels={compactLabels}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );

  const renderDesktopHeaderActions = (className: string) => (
    <div className={className}>
      {isAuthenticated && user ? <AccountModeSwitch className={cn(
        'hidden self-center !rounded-[1.05rem] !p-0.5 lg:inline-flex xl:!rounded-[1.15rem] xl:!p-1',
        headerOnHero
          ? '!border-white/16 !bg-black/18 !shadow-[0_18px_34px_-28px_rgba(0,0,0,0.34)]'
          : '!border-slate-200/90 !bg-white/96 !shadow-[0_18px_34px_-28px_rgba(15,23,42,0.18)]',
      )} buttonClassName={cn(
        '!h-11 !rounded-[0.9rem] !px-2.5 !text-[0.82rem] !font-semibold !shadow-none transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 xl:!h-12 xl:!rounded-[0.95rem] xl:!px-3 xl:!text-[0.88rem]',
        headerOnHero
          ? '[&:not([data-loading=true])]:!text-white/82 [&:not([data-loading=true])]:hover:!text-white'
          : '[&:not([data-loading=true])]:!text-slate-600 [&:not([data-loading=true])]:hover:!text-slate-950',
      )} compact /> : null}

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
              'hidden h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1rem] border transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:inline-flex lg:h-14 lg:w-14',
              headerOnHero
                ? 'border-white/16 bg-black/16 text-white/84 shadow-[0_16px_30px_-26px_rgba(0,0,0,0.3)] backdrop-blur-[10px] hover:border-white/22 hover:bg-black/24 hover:text-white hover:shadow-[0_18px_32px_-24px_rgba(0,0,0,0.3)]'
                : 'border-slate-200/88 bg-white/92 text-slate-500 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.16)] hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-[0_18px_32px_-24px_rgba(15,23,42,0.18)]',
            )}
            aria-label="Mis reservas"
          >
            <Icons.Calendar className="h-[1.05rem] w-[1.05rem] lg:h-[1.1rem] lg:w-[1.1rem]" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className={cn(
              'flex h-[3.25rem] items-center gap-2.5 rounded-full px-3.5 transition-[background-color,border-color,box-shadow,transform,color] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 sm:h-[3.35rem] sm:gap-3 sm:px-4 lg:h-14 lg:px-[1.05rem]',
              headerOnHero
                ? 'border border-white/18 bg-black/20 text-white shadow-[0_18px_35px_-28px_rgba(0,0,0,0.32)] backdrop-blur-[12px] hover:border-white/26 hover:bg-black/28 hover:shadow-[0_22px_40px_-28px_rgba(0,0,0,0.34)]'
                : 'border border-slate-200/90 bg-white/98 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)] hover:border-slate-300 hover:bg-white hover:shadow-[0_22px_40px_-28px_rgba(15,23,42,0.22)]',
            )}
            aria-label="Ir al perfil"
          >
            <div className="hidden text-right min-[1800px]:block">
              <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', headerOnHero ? 'text-white/62' : 'text-slate-400')}>Cuenta</div>
              <div className={cn('text-[0.96rem] font-bold leading-tight', headerOnHero ? 'text-white' : 'text-slate-900')}>{user.name}</div>
            </div>
            <div className={cn('h-10 w-10 overflow-hidden rounded-full lg:h-11 lg:w-11', headerOnHero ? 'bg-white/16' : 'bg-slate-100')}>
              <img src={user.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} className="h-full w-full object-cover" />
            </div>
          </button>
        </>
      ) : showGuestAuthActions ? (
        <>
          <button
            type="button"
            onClick={() => openLoginModal()}
            className={cn(
              'hidden h-[3.25rem] shrink-0 items-center rounded-full border px-6 text-[0.98rem] font-semibold tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:inline-flex lg:h-14 lg:px-7 lg:text-[1.04rem]',
              headerOnHero
                ? 'border-white/18 bg-white/12 text-white/92 shadow-[0_18px_34px_-26px_rgba(0,0,0,0.24)] backdrop-blur-[12px] hover:border-white/24 hover:bg-white/18 hover:text-white hover:shadow-[0_18px_34px_-24px_rgba(0,0,0,0.26)]'
                : 'border-slate-200/90 bg-white/96 text-slate-900 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.14)] hover:border-slate-300 hover:bg-white hover:text-slate-950 hover:shadow-[0_18px_34px_-24px_rgba(15,23,42,0.16)]',
            )}
          >
            Ingresá
          </button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            aria-label="Publicar propiedad"
            className={cn(
              'app-button-primary h-[3.25rem] whitespace-nowrap rounded-[1.2rem] border border-transparent px-5 text-[0.97rem] transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 sm:px-6 sm:text-[1rem] lg:h-14 lg:px-5 lg:text-[0.98rem] xl:px-7 xl:text-[1.05rem]',
              headerOnHero ? 'shadow-[0_22px_42px_-26px_rgba(15,23,42,0.48)]' : 'shadow-[0_20px_38px_-26px_rgba(55,48,163,0.52)]',
            )}
          >
            <span className="xl:hidden">Publicar</span>
            <span className="hidden xl:inline">Publicar propiedad</span>
            <Icons.ArrowRight className="hidden h-4.5 w-4.5 sm:block" />
          </button>
        </>
      ) : hasSessionError ? (
        <button
          type="button"
          onClick={() => void refresh()}
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center transition-[border-color,color,background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transform-none hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] md:min-h-[3.25rem] md:w-auto md:gap-3 md:px-5 md:py-0 lg:min-h-14 lg:px-6',
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
          'inline-flex h-10 w-10 items-center justify-center md:min-h-[3.25rem] md:w-auto md:gap-3 md:px-0 md:py-0 lg:min-h-14',
          headerOnHero
            ? 'rounded-full border border-white/16 bg-black/18 text-white/84 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.28)] backdrop-blur-[10px] md:rounded-none md:border-transparent md:bg-transparent md:shadow-none'
            : 'rounded-full border border-slate-200/80 bg-white/88 text-slate-500 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18)] md:rounded-none md:border-transparent md:bg-transparent md:shadow-none',
        )}>
          <Icons.Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden md:inline">Verificando sesión...</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <NotificationToast />
      <Suspense fallback={null}>
        <LazyLoginModal />
      </Suspense>

      {showHeader ? (
        <header className={cn('app-header z-50', isPropertyDetailRoute ? 'app-header-detail' : 'relative', headerOnHero && 'app-header-on-hero')}>
          {useSymmetricGuestHeader ? (
            <div className={cn(headerLayoutClass, 'flex items-center justify-between gap-5 py-4 sm:gap-6 sm:py-5 lg:gap-8 xl:gap-10')}>
              <div className={guestDesktopHeaderPrimaryClass}>
                {brandHomeButton}
                {renderDesktopNavigation(guestDesktopHeaderNavigationClass)}
              </div>

              {renderDesktopHeaderActions(guestDesktopActionsClass)}
            </div>
          ) : (
            <div className={cn(headerLayoutClass, 'flex items-center justify-between gap-5 py-4 sm:gap-6 sm:py-5 lg:gap-8 xl:gap-10')}>
              <div className={accountDesktopHeaderPrimaryClass}>
                {brandHomeButton}
                {renderDesktopNavigation(accountDesktopHeaderNavigationClass, true)}
              </div>
              {renderDesktopHeaderActions(accountDesktopActionsClass)}
            </div>
          )}
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
