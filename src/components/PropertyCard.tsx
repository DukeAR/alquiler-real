import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { getGuestCardOnboardingTip } from '../lib/contextualOnboarding';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { getPropertyCardVerificationState } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ContextualTip } from './ui/ContextualTip';

const normalizePropertyText = (value?: string) => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getPropertyTypeLabel = (property: Property) => {
  const explicitType = normalizePropertyText(property.propertyType);

  if (explicitType.includes('house') || explicitType.includes('casa')) return 'Casa';
  if (explicitType.includes('apartment') || explicitType.includes('depto') || explicitType.includes('depart')) return 'Departamento';
  if (explicitType.includes('room') || explicitType.includes('habitacion') || explicitType.includes('habitación')) return 'Habitación';
  if (explicitType.includes('cabin') || explicitType.includes('caba')) return 'Cabaña';

  const title = normalizePropertyText(property.title);

  if (title.includes('casa')) return 'Casa';
  if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'Casa';
  if (title.includes('monoambiente')) return 'Departamento';
  if (title.includes('depto') || title.includes('depart')) return 'Departamento';
  if (title.includes('habitacion') || title.includes('habitación') || title.includes('cuarto')) return 'Habitación';
  if (title.includes('caba')) return 'Cabaña';

  return 'Alojamiento';
};

const getGuestCapacityLabel = (maxGuests?: number | null) => {
  if (!maxGuests || maxGuests < 1) {
    return null;
  }

  return `Hasta ${maxGuests} ${maxGuests === 1 ? 'huésped' : 'huéspedes'}`;
};

const getTrustContextEyebrow = (level: ReturnType<typeof getPropertyCardVerificationState>['publicLevel']) => {
  if (level === 'presencial') {
    return 'Verificación presencial';
  }

  if (level === 'identity') {
    return 'Identidad del anfitrión';
  }

  return 'Información publicada';
};

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (propertyId: string, isFavorite: boolean) => void | Promise<unknown>;
  variant?: 'default' | 'favorites';
  density?: 'default' | 'compact';
  verificationGuidanceLabel?: string | null;
  emphasizeVerification?: boolean;
  decisionFeatured?: boolean;
  decisionSupportLabel?: string | null;
  deemphasizeNonPresencial?: boolean;
  className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick,
  isFavorite = false,
  onFavoriteToggle,
  variant = 'default',
  density = 'default',
  deemphasizeNonPresencial = false,
  className,
}) => {
  const auth = useAuth();
  const user = auth.user;
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const isFavoritesVariant = variant === 'favorites';
  const verificationState = getPropertyCardVerificationState(property);
  const isPresencialCard = verificationState.publicLevel === 'presencial';
  const isIdentityCard = verificationState.publicLevel === 'identity';
  const isUnverifiedCard = verificationState.publicLevel === 'none';
  const isComparisonMutedCard = deemphasizeNonPresencial && !isPresencialCard;
  const isComparisonIdentityCard = deemphasizeNonPresencial && isIdentityCard;
  const isComparisonUnverifiedCard = deemphasizeNonPresencial && isUnverifiedCard;
  const shouldShowPresencialVerification = isPresencialCard;
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const guestCapacityLabel = getGuestCapacityLabel(Number(property.maxGuests) || null);
  const propertyCardCtaLabel = 'Ver propiedad';
  const isCompactCard = density === 'compact';
  const onboardingTip = {
    ...getGuestCardOnboardingTip(verificationState.publicLevel),
    eyebrow: getTrustContextEyebrow(verificationState.publicLevel),
  };
  const [isNavigating, setIsNavigating] = React.useState(false);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
  }, []);

  const handleCardActivate = () => {
    if (!onClick || isNavigating) {
      return;
    }

    setIsNavigating(true);
    navigationTimeoutRef.current = setTimeout(() => {
      onClick();
    }, 180);
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { user } = auth;
    if (!user) {
      import('../lib/modal').then(m => m.showLoginModal());
      return;
    }
    void onFavoriteToggle?.(property.id, !isFavorite);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || e.target !== e.currentTarget) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardActivate();
    }
  };

  return (
    <Card
      padding="none"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Ver propiedad: ${property.title}` : undefined}
      onClick={handleCardActivate}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'group box-border flex h-full w-full transform-gpu flex-col overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_14px_34px_-22px_rgba(15,23,42,0.16)] transition-[transform,box-shadow,border-color,opacity] duration-150 ease-[ease]',
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/10',
        onClick && !isComparisonMutedCard && 'hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_54px_-26px_rgba(15,23,42,0.24)] focus-visible:-translate-y-1 focus-visible:border-slate-300 focus-visible:shadow-[0_28px_54px_-26px_rgba(15,23,42,0.24)]',
        onClick && isComparisonMutedCard && 'hover:-translate-y-1 focus-visible:-translate-y-1',
        isFavoritesVariant && 'shadow-[0_16px_36px_-24px_rgba(15,23,42,0.16)]',
        isPresencialCard && 'border-2 border-[#22c55e] shadow-lg',
        isPresencialCard && onClick && 'hover:border-[#22c55e] hover:shadow-[0_30px_58px_-28px_rgba(34,197,94,0.28)] focus-visible:border-[#22c55e] focus-visible:shadow-[0_30px_58px_-28px_rgba(34,197,94,0.28)]',
        isComparisonMutedCard && 'border-transparent bg-white/96',
        isComparisonIdentityCard && '!shadow-sm',
        isComparisonIdentityCard && onClick && 'hover:!shadow-[0_22px_40px_-28px_rgba(15,23,42,0.14)] focus-visible:!shadow-[0_22px_40px_-28px_rgba(15,23,42,0.14)]',
        isComparisonUnverifiedCard && 'opacity-90 !shadow-none',
        isComparisonUnverifiedCard && onClick && 'hover:opacity-100 hover:!shadow-[0_20px_36px_-28px_rgba(15,23,42,0.12)] focus-visible:opacity-100 focus-visible:!shadow-[0_20px_36px_-28px_rgba(15,23,42,0.12)]',
        isNavigating && 'scale-[1.015] opacity-0 pointer-events-none',
        className,
      )}
    >
      <div className={cn(
        'relative h-[232px] overflow-hidden bg-slate-100 sm:h-[260px] lg:h-[300px]',
        isCompactCard && 'md:h-[224px] lg:h-[238px] xl:h-[250px]',
      )}>
        <img 
          src={imageSrc} 
          alt={property.title}
          className="h-full w-full transform-gpu object-cover transition-transform duration-150 ease-[ease] group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/24 via-slate-950/8 to-transparent" />
        <span
          data-testid="property-card-cta"
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute bottom-4 right-4 z-10 inline-flex shrink-0 transform-gpu items-center gap-1.5 self-start rounded-full border border-white/18 bg-white/96 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_32px_-22px_rgba(15,23,42,0.3)] backdrop-blur-sm opacity-0 translate-y-1 transition-[opacity,transform,background-color,border-color,box-shadow] duration-150 ease-[ease] group-hover:translate-y-0 group-hover:opacity-100 group-hover:border-white/40 group-hover:bg-white group-hover:shadow-[0_18px_34px_-22px_rgba(15,23,42,0.34)] group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:border-white/40 group-focus-visible:bg-white group-focus-visible:shadow-[0_18px_34px_-22px_rgba(15,23,42,0.34)]',
            isComparisonUnverifiedCard && 'border-slate-200/85 bg-white/94 text-[#475569] shadow-[0_12px_26px_-20px_rgba(15,23,42,0.18)]',
            isCompactCard && 'bottom-3 right-3 px-3.5 py-1.5 text-[0.82rem]',
          )}
        >
          <span>{propertyCardCtaLabel}</span>
          <Icons.ArrowRight className="h-3.5 w-3.5" />
        </span>

        {user ? (
          <div className="absolute right-4 top-4">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleFavoriteToggle}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Quitar de guardados' : 'Guardar propiedad'}
              className={cn(
                'h-10 w-10 rounded-full border-white/80 bg-white/94 text-slate-700 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.24)] backdrop-blur-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150',
                isFavorite
                  ? 'border-brand bg-brand text-white hover:border-brand hover:bg-brand-dark hover:text-white'
                  : 'hover:border-brand/30 hover:bg-white hover:text-brand',
              )}
            >
              <Icons.Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        ) : null}
      </div>

      <div className={cn('flex h-full flex-1 flex-col p-5 md:p-6', isCompactCard && 'p-4 md:p-5')}>
        <div>
          <div>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.22em] text-slate-500', isComparisonUnverifiedCard && 'text-[#64748b]')}>
              {propertyTypeLabel}
            </p>
            <h3 className={cn(
              'mt-1 min-h-[3.6rem] line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-slate-900 transition-colors duration-150 group-hover:text-slate-900',
              isComparisonUnverifiedCard && 'text-[#64748b] group-hover:text-slate-700',
              isCompactCard && 'min-h-[3.2rem]',
            )}>
              {property.title}
            </h3>
          </div>

          <div className={cn('mt-4', isCompactCard && 'mt-3')}>
            <div data-testid="property-card-price-row" className="flex items-baseline gap-1.5">
              <p className={cn('text-[2.05rem] font-semibold leading-none tracking-[-0.04em] text-slate-950', isComparisonUnverifiedCard && 'text-[#64748b]')}>
                {formatCurrency(Number(property.price) || 0)}
              </p>
              <span className={cn('ml-1 text-sm font-medium text-slate-500', isComparisonUnverifiedCard && 'text-[#64748b]')}>/ noche</span>
            </div>

          </div>
          {shouldShowPresencialVerification ? (
            <div
              data-testid="property-card-verification"
              aria-label={verificationState.summaryTitle}
              className={cn('mt-5 px-0 py-0', isCompactCard && 'mt-4')}
            >
              <div className="inline-flex max-w-full items-start gap-3 rounded-2xl border border-emerald-300/70 bg-[#ECFDF3] px-4 py-3 shadow-[0_16px_30px_-22px_rgba(22,163,74,0.28)] transition-[background-color,border-color,box-shadow] duration-150 ease-[ease] group-hover:border-emerald-400/80 group-hover:bg-emerald-200/70 group-hover:shadow-[0_20px_36px_-22px_rgba(22,163,74,0.34)] group-focus-visible:border-emerald-400/80 group-focus-visible:bg-emerald-200/70 group-focus-visible:shadow-[0_20px_36px_-22px_rgba(22,163,74,0.34)]">
                <span
                  data-testid="property-card-verification-icon"
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 transform-gpu items-center justify-center rounded-full bg-emerald-200 text-emerald-800 transition-transform duration-150 ease-[ease] group-hover:scale-[1.05] group-focus-visible:scale-[1.05]"
                >
                  <Icons.ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.98rem] font-semibold leading-5 text-emerald-900">
                    {verificationState.summaryTitle}
                  </p>
                  {verificationState.summaryDescription ? (
                    <p className="mt-1 text-[0.74rem] leading-4 text-emerald-900/80">
                      {verificationState.summaryDescription}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn('mt-auto pt-5', isCompactCard && 'pt-4')}>
          <div className="border-t border-gray-200" />

          <div className={cn('mt-4 flex flex-col gap-3', isCompactCard && 'mt-3 gap-2.5')}>
            <div className="min-w-0">
              <div className={cn('flex flex-wrap items-center gap-4 text-sm font-medium leading-5 text-slate-600', isComparisonUnverifiedCard && 'text-[#64748b]', isCompactCard && 'gap-3.5 text-[0.88rem]')}>
                <span className="inline-flex items-center gap-1.5">
                  <Icons.MapPin className={cn('h-3.5 w-3.5 text-slate-400', isComparisonUnverifiedCard && 'text-slate-300')} />
                  <span>{property.location}</span>
                </span>
                {guestCapacityLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.Users className={cn('h-3.5 w-3.5 text-slate-400', isComparisonUnverifiedCard && 'text-slate-300')} />
                    <span>{guestCapacityLabel}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <ContextualTip
              compact={isCompactCard}
              tone={onboardingTip.tone}
              eyebrow={onboardingTip.eyebrow}
              body={onboardingTip.body}
              className="shadow-none"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
