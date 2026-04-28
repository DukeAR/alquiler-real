import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { getPropertyCardVerificationState, REAL_VERIFICATION_FILTER_MIN_SCORE } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { VerificationBadgePremium } from './ui/VerificationBadgePremium';

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

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (propertyId: string, isFavorite: boolean) => void | Promise<unknown>;
  variant?: 'default' | 'favorites';
  verificationGuidanceLabel?: string | null;
  emphasizeVerification?: boolean;
  decisionFeatured?: boolean;
  decisionSupportLabel?: string | null;
  className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick,
  isFavorite = false,
  onFavoriteToggle,
  variant = 'default',
  className,
}) => {
  const auth = useAuth();
  const user = auth.user;
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const isFavoritesVariant = variant === 'favorites';
  const verificationState = getPropertyCardVerificationState(property);
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const guestCapacityLabel = getGuestCapacityLabel(Number(property.maxGuests) || null);
  const usesVerifiedCardLayout = verificationState.count >= REAL_VERIFICATION_FILTER_MIN_SCORE;
  const premiumVerificationSummary = 'Verificado presencialmente · Datos confirmados';
  const verifiedCardSummary = verificationState.presencialVerified
    ? premiumVerificationSummary
    : `${verificationState.countLabel ?? verificationState.summaryTitle} · Información validada`;
  const propertyCardCtaLabel = 'Ver detalle';
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
      onClick();
    }
  };

  return (
    <Card
      padding="none"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Abrir detalle de ${property.title}` : undefined}
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_14px_34px_-22px_rgba(15,23,42,0.16)] transition-all duration-300 ease-out',
        onClick && 'cursor-pointer hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_44px_-24px_rgba(15,23,42,0.18)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/10',
        isFavoritesVariant && 'shadow-[0_16px_36px_-24px_rgba(15,23,42,0.16)]',
        className,
      )}
    >
      <div className="relative h-[232px] overflow-hidden bg-slate-100 sm:h-[260px] lg:h-[300px]">
        <img 
          src={imageSrc} 
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/24 via-slate-950/8 to-transparent" />

        {verificationState.presencialVerified ? (
          <VerificationBadgePremium
            size="xs"
            data-testid="property-card-premium-badge"
            className="absolute left-4 top-4 z-20 origin-top-left scale-[0.75]"
          />
        ) : null}

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

      <div className="flex h-full flex-1 flex-col p-5 md:p-6">
        <div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {propertyTypeLabel}
            </p>
            <h3 className={cn(
              'mt-1 min-h-[3.25rem] line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-slate-900 transition-colors duration-150 group-hover:text-slate-900',
              !usesVerifiedCardLayout && 'min-h-[3.6rem]',
            )}>
              {property.title}
            </h3>
          </div>

          <div className="mt-4">
            <div data-testid="property-card-price-row" className="flex items-baseline gap-1.5">
              <p className="text-3xl font-semibold leading-none tracking-tight text-slate-900">
                {formatCurrency(Number(property.price) || 0)}
              </p>
              <span className="ml-1 text-sm text-slate-500">/ noche</span>
            </div>

            {usesVerifiedCardLayout ? (
              <p
                data-testid="property-card-verification"
                aria-label={verifiedCardSummary}
                className="mt-2 text-sm leading-5 text-slate-500"
              >
                {verifiedCardSummary}
              </p>
            ) : null}
          </div>

          {!usesVerifiedCardLayout ? (
            <div
              data-testid="property-card-verification"
              aria-label={verificationState.countLabel ?? verificationState.summaryTitle}
              className="mt-4 min-h-[5.5rem] flex flex-col gap-3.5 px-0 py-0"
            >
              <>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {verificationState.summaryTitle}
                  </p>
                  <p className="text-[0.82rem] font-medium leading-4 text-slate-600">
                    {verificationState.countLabel}
                  </p>
                </div>

                <ul className="space-y-2.5 pb-1" aria-label="Checks de verificación">
                  {verificationState.checks.map((check) => (
                    <li
                      key={check.key}
                      data-status={check.complete ? 'complete' : 'pending'}
                      className="flex items-start gap-2.5 text-[0.82rem] font-medium leading-[1.15rem]"
                    >
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                        {check.complete ? (
                          <Icons.Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        )}
                      </span>

                      <span className={cn('pt-px tracking-[-0.01em]', check.complete ? 'text-slate-700' : 'text-slate-400')}>
                        {check.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            </div>
          ) : null}
        </div>

        <div className={cn('mt-auto pt-4', !usesVerifiedCardLayout && 'pt-5')}>
          <div className="border-t border-gray-200" />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium leading-5 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Icons.MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{property.location}</span>
                </span>
                {guestCapacityLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{guestCapacityLabel}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <span
              data-testid="property-card-cta"
              aria-hidden="true"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.12)] transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-900 sm:self-auto"
            >
              <span>{propertyCardCtaLabel}</span>
              <Icons.ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
