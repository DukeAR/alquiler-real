import React, { Suspense, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { NotificationToast } from './NotificationToast';
import { AIAssistant } from './AIAssistant';
import { NotificationsMenu } from './NotificationsMenu';
import { AccountModeSwitch } from './ui/AccountModeSwitch';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { NotificationsContext, useNotifications } from '../hooks/useNotifications';
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
  desktopAccent?: boolean;
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
  '/operations',
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
  '/operations',
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
  '/internal/support',
  '/operations',
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
  accent = false,
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
      : accent
        ? 'text-slate-600 hover:text-slate-950 after:scale-x-100 after:bg-brand'
        : 'text-slate-600 hover:text-slate-950 after:bg-slate-300',
    active && (inverted ? 'text-white after:scale-x-100 after:bg-white' : 'text-slate-950 after:scale-x-100 after:bg-brand'),
  );
};

const getDesktopNavIconClassName = (
  active: boolean,
  inverted = false,
  style: NavAction['desktopStyle'] = 'default',
  prominent = false,
  accent = false,
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
      : active || accent ? 'text-brand group-hover:text-brand-dark' : 'text-slate-400 group-hover:text-slate-500',
  );
};

const DesktopNavButton = ({
  action,
  active,
  inverted = false,
  compactLabels = false,
  showIcon = true,
  onSelect,
}: {
  action: NavAction;
  active: boolean;
  inverted?: boolean;
  compactLabels?: boolean;
  showIcon?: boolean;
  onSelect: (action: NavAction) => void;
}) => (
  action.path && !action.onClick && !action.protected ? (
    <Link
      to={action.path}
      aria-label={getNavAriaLabel(action)}
      aria-current={active ? 'page' : undefined}
      className={getDesktopNavItemClassName(active, inverted, action.desktopStyle, action.desktopProminent, action.desktopAccent)}
    >
      {showIcon ? <action.icon className={getDesktopNavIconClassName(active, inverted, action.desktopStyle, action.desktopProminent, action.desktopAccent)} /> : null}
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
      className={getDesktopNavItemClassName(active, inverted, action.desktopStyle, action.desktopProminent, action.desktopAccent)}
    >
      {showIcon ? <action.icon className={getDesktopNavIconClassName(active, inverted, action.desktopStyle, action.desktopProminent, action.desktopAccent)} /> : null}
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
  const [isAuthenticatedMobileMenuOpen, setIsAuthenticatedMobileMenuOpen] = useState(false);
  const isAuthGuardedRoute = authGuardedPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const showGuestAuthActions = !user && (isUnauthenticated || (hasSessionError && !isAuthGuardedRoute));
  const canAccessInternalSupport = Boolean(user?.canInternalOps);
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
    setIsAuthenticatedMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticatedMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAuthenticatedMobileMenuOpen(false);
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthenticatedMobileMenuOpen]);

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
  const showAuthenticatedMobileMenu = showMobileNav && isAuthenticated && Boolean(user);
  const showBottomMobileNav = showMobileNav && !showAuthenticatedMobileMenu;
  const showAssistant = !hiddenAssistantPrefixes.some((prefix) => matchesPath(location.pathname, prefix));
  const usesExploreLayoutWidth = location.pathname === '/' || matchesPath(location.pathname, '/explore');
  const headerLayoutClass = usesExploreLayoutWidth ? 'app-page-explore' : 'app-page';
  const headerOnHero = isPropertyDetailRoute && isPropertyHeroVisible;
  const useSymmetricGuestHeader = showGuestAuthActions;
  const guestDesktopHeaderPrimaryClass = 'flex min-w-0 flex-1 items-center justify-between gap-6 sm:gap-7 lg:gap-8 xl:gap-10';
  const guestDesktopHeaderNavigationClass = cn(
    'hidden min-w-0 flex-1 items-center justify-between gap-5 rounded-[1.9rem] px-5 py-1.5 lg:flex lg:justify-start lg:gap-3 lg:px-3.5 xl:justify-between xl:gap-6 xl:px-8',
    headerOnHero
      ? 'border border-white/14 bg-black/12 shadow-[0_22px_46px_-36px_rgba(0,0,0,0.46)] backdrop-blur-[14px]'
      : 'border border-slate-200/80 bg-white/72 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.16)] backdrop-blur-[14px]',
  );
  const accountDesktopHeaderNavigationClass = cn(
    'hidden min-w-0 flex-1 items-center justify-center gap-4 rounded-[1.6rem] px-3.5 py-1 lg:flex xl:gap-5 xl:px-5',
    headerOnHero
      ? 'border border-white/14 bg-black/12 shadow-[0_22px_46px_-36px_rgba(0,0,0,0.46)] backdrop-blur-[14px]'
      : 'border border-slate-200/80 bg-white/72 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.16)] backdrop-blur-[14px]',
  );
  const guestDesktopActionsClass = 'flex shrink-0 items-center justify-end gap-4 sm:gap-5 lg:pl-3 lg:gap-6 xl:pl-4 xl:gap-7';
  const accountDesktopActionsClass = 'flex shrink-0 items-center justify-end gap-2 sm:gap-2.5 lg:gap-3 xl:gap-3.5';
  const guestDesktopHeaderRowClass = 'flex items-center justify-between gap-4 py-3 sm:gap-6 sm:py-5 lg:gap-8 xl:gap-10';
  const accountDesktopHeaderRowClass = 'flex items-center justify-between gap-3 py-2.5 sm:gap-5 sm:py-4 lg:gap-6 xl:gap-7';
  const accountHeaderUtilityButtonClass = cn(
    '!h-10 !w-10 sm:!h-11 sm:!w-11 !rounded-full !border !p-0 !shadow-none transition-[color,background-color,border-color] duration-150 ease-out hover:translate-y-0 active:translate-y-0',
    headerOnHero
      ? '!border-white/16 !bg-black/18 !text-white/84 hover:!border-white/24 hover:!bg-black/26 hover:!text-white'
      : '!border-slate-200/90 !bg-white/96 !text-slate-500 hover:!border-slate-300 hover:!bg-white hover:!text-slate-900',
  );
  const accountModeSwitchClass = cn(
    'hidden self-center !rounded-[0.95rem] !border !p-1 !shadow-none lg:inline-flex',
    headerOnHero
      ? '!border-white/16 !bg-black/18'
      : '!border-slate-200/90 !bg-white/96',
  );
  const accountModeSwitchButtonClass = '!h-9 !min-w-[4.95rem] !rounded-[0.72rem] !px-2.5 !text-[0.78rem] !font-semibold !shadow-none transition-colors duration-150 ease-out hover:translate-y-0 active:translate-y-0';
  const accountModeSwitchActiveClass = '!border-transparent !bg-brand !text-white !shadow-none hover:!bg-brand-dark hover:!text-white hover:!shadow-none dark:!border-transparent dark:!bg-brand dark:hover:!bg-brand-dark';
  const accountModeSwitchInactiveClass = '!border-transparent !bg-transparent !text-slate-500 hover:!bg-slate-100/90 hover:!text-slate-900 dark:!text-slate-300 dark:hover:!bg-slate-800/80 dark:hover:!text-slate-50';

  const desktopActions: NavAction[] = [
    { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
    ...(isAuthenticated ? [favoritesAction] : []),
    ...(isAuthenticated ? [{ label: 'Mis operaciones', shortLabel: 'Operaciones', path: '/operations', protected: true, icon: Icons.Activity }] : []),
    ...(isAuthenticated && canAccessInternalSupport ? [{ label: 'Soporte interno', shortLabel: 'Soporte', path: '/internal/support', protected: true, icon: Icons.ShieldAlert }] : []),
    { label: 'Cómo funciona', shortLabel: 'Cómo', path: '/about', icon: Icons.Info, desktopAccent: !isAuthenticated },
    { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb, desktopAccent: !isAuthenticated }
  ];

  const authenticatedMobileMenuActions: NavAction[] = isAuthenticated
    ? [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        favoritesAction,
        { label: 'Mis operaciones', shortLabel: 'Operaciones', path: '/operations', protected: true, icon: Icons.Activity },
        { label: 'Perfil', shortLabel: 'Perfil', path: '/profile', protected: true, icon: Icons.User },
        ...(canAccessInternalSupport ? [{ label: 'Soporte interno', shortLabel: 'Soporte interno', path: '/internal/support', protected: true, icon: Icons.ShieldAlert }] : []),
        { label: 'Cómo funciona', shortLabel: 'Cómo funciona', path: '/about', icon: Icons.Info },
        { label: 'Ayuda', shortLabel: 'Ayuda', path: '/faq', icon: Icons.Lightbulb },
      ]
    : [];

  const mobileActions: NavAction[] = isAuthenticated
    ? [
        { label: 'Explorar', shortLabel: 'Explorar', path: '/', icon: Icons.Search },
        favoritesAction,
        { label: 'Operaciones', shortLabel: 'Operaciones', path: '/operations', protected: true, icon: Icons.Activity },
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

  const renderDesktopNavigation = (className: string, compactLabels = false, showIcon = true) => (
    <nav aria-label="Navegación principal" className={className}>
      {desktopActions.map((action) => (
        <DesktopNavButton
          key={action.label}
          action={action}
          active={!!action.path && matchesPath(location.pathname, action.path)}
          inverted={headerOnHero}
          compactLabels={compactLabels}
          showIcon={showIcon}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );

  const renderDesktopHeaderActions = (className: string) => (
    <div className={className}>
      {isAuthenticated && user ? (
        <button
          type="button"
          aria-label={isAuthenticatedMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-controls="authenticated-mobile-menu"
          aria-expanded={isAuthenticatedMobileMenuOpen}
          onClick={() => setIsAuthenticatedMobileMenuOpen((current) => !current)}
          className={cn(accountHeaderUtilityButtonClass, 'lg:hidden')}
        >
          {isAuthenticatedMobileMenuOpen ? <Icons.X className="h-[1.05rem] w-[1.05rem]" /> : <Icons.Menu className="h-[1.05rem] w-[1.05rem]" />}
        </button>
      ) : null}

      {isAuthenticated && user ? <AccountModeSwitch className={accountModeSwitchClass} buttonClassName={accountModeSwitchButtonClass} activeButtonClassName={accountModeSwitchActiveClass} inactiveButtonClassName={accountModeSwitchInactiveClass} compact /> : null}

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
          buttonClassName={accountHeaderUtilityButtonClass}
        />
      ) : null}

      {isAuthenticated && user ? (
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className={cn(accountHeaderUtilityButtonClass, 'hidden sm:inline-flex')}
          aria-label="Ir al perfil"
        >
          <div className={cn('h-full w-full overflow-hidden rounded-full', headerOnHero ? 'bg-white/16' : 'bg-slate-100')}>
            <img src={user.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} className="h-full w-full object-cover" />
          </div>
        </button>
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
    <NotificationsContext.Provider value={notifications}>
      <div className="app-shell">
        <NotificationToast />
        <Suspense fallback={null}>
          <LazyLoginModal />
        </Suspense>

      {showHeader ? (
        <header className={cn('app-header z-50', isPropertyDetailRoute ? 'app-header-detail' : 'relative', headerOnHero && 'app-header-on-hero')}>
          {useSymmetricGuestHeader ? (
            <div className={cn(headerLayoutClass, guestDesktopHeaderRowClass)}>
              <div className={guestDesktopHeaderPrimaryClass}>
                {brandHomeButton}
                {renderDesktopNavigation(guestDesktopHeaderNavigationClass)}
              </div>

              {renderDesktopHeaderActions(guestDesktopActionsClass)}
            </div>
          ) : (
            <div className={cn(headerLayoutClass, accountDesktopHeaderRowClass)}>
              {brandHomeButton}
              {renderDesktopNavigation(accountDesktopHeaderNavigationClass, false, false)}
              {renderDesktopHeaderActions(accountDesktopActionsClass)}
            </div>
          )}
        </header>
      ) : null}

      {showAuthenticatedMobileMenu && isAuthenticated && user && isAuthenticatedMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsAuthenticatedMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/24 backdrop-blur-[2px]"
          />

          <div
            id="authenticated-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+4.15rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-5rem)] overflow-y-auto rounded-[26px] border border-slate-200/90 bg-white/98 p-4 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.26)] backdrop-blur-xl sm:inset-x-4 sm:top-[calc(env(safe-area-inset-top)+4.75rem)] sm:max-h-[calc(100dvh-env(safe-area-inset-top)-6rem)] sm:rounded-[28px]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-400">Tu cuenta</p>
                <p className="truncate text-[1.02rem] font-semibold text-slate-950">{user.name}</p>
              </div>

              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setIsAuthenticatedMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 transition-colors duration-150 hover:border-slate-300 hover:text-slate-900"
              >
                <Icons.X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-4 rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-1.5">
              <AccountModeSwitch
                compact
                className="!flex !w-full !justify-center !border-transparent !bg-transparent !p-0 !shadow-none"
                buttonClassName="!h-9 !min-w-[5rem] !flex-1 !rounded-[0.72rem] !px-2.5 !text-[0.8rem] !font-semibold !shadow-none transition-colors duration-150"
                activeButtonClassName={accountModeSwitchActiveClass}
                inactiveButtonClassName={accountModeSwitchInactiveClass}
              />
            </div>

            <nav aria-label="Menú autenticado" className="mt-4 space-y-1.5">
              {authenticatedMobileMenuActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    void onSelect(action);
                    setIsAuthenticatedMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200/85 bg-white px-4 py-3 text-left shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50"
                  aria-label={getNavAriaLabel(action)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <action.icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 truncate text-[0.95rem] font-semibold text-slate-900">{action.label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {action.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                        {action.badge}
                      </span>
                    ) : null}
                    <Icons.ChevronRight className="h-4 w-4 text-slate-400" />
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <div className={cn('min-h-screen', showBottomMobileNav ? 'pb-[calc(env(safe-area-inset-bottom)+5.35rem)] md:pb-10' : '')}>{children}</div>

      {showBottomMobileNav ? (
        <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 md:hidden">
          <div className="mx-auto flex max-w-md items-center gap-1 rounded-t-[26px] border border-b-0 border-slate-200/85 bg-white/95 px-3.5 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2.5 shadow-[0_-18px_40px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl">
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
    </NotificationsContext.Provider>
  );
};

export default AppShell;
