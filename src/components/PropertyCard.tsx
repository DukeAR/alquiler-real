import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { getPropertyVerificationDetails } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PresencialVerificationBadge } from './ui/PresencialVerificationBadge';

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
  decisionFeatured = false,
  className,
}) => {
  const auth = useAuth();
  const user = auth.user;
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const isFavoritesVariant = variant === 'favorites';
  const isDecisionFeatured = decisionFeatured && !isFavoritesVariant;
  const verificationDetails = getPropertyVerificationDetails(property);
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const guestCapacityLabel = getGuestCapacityLabel(Number(property.maxGuests) || null);
  const showPresencialBadge = verificationDetails.isFullyVerified;
  const standardVerificationSummary = `${verificationDetails.score} ${verificationDetails.score === 1 ? 'dato comprobado' : 'datos comprobados'}`;
  const standardVerificationItems = verificationDetails.compactItems.slice(0, 3).map((item) => ({
    key: item.key,
    label: item.key === 'photos' ? 'Fotos reales' : item.label,
  }));
  const premiumVerificationTitle = 'Información verificada en persona';
  const premiumVerificationDescription = 'Ubicación, anfitrión y datos confirmados';
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
        'group flex h-full flex-col overflow-hidden border-[color:var(--app-surface-border)] bg-white shadow-[var(--app-shadow-subtle)] transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out',
        onClick && 'cursor-pointer hover:-translate-y-[3px] hover:border-[color:var(--app-surface-border-strong)] hover:shadow-[var(--app-shadow-raised)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/10',
        showPresencialBadge && 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,0.94)_100%)] shadow-[0_26px_54px_-40px_rgba(15,23,42,0.22)]',
        isDecisionFeatured && 'border-brand/35 shadow-[0_24px_46px_-34px_rgba(67,56,202,0.26)]',
        isFavoritesVariant && 'bg-white shadow-[var(--app-shadow-soft)]',
        className,
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-slate-100 lg:aspect-[4/3]">
        <img 
          src={imageSrc} 
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.012]"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/24 via-slate-950/8 to-transparent" />

        {showPresencialBadge ? (
          <div className="absolute left-4 top-4">
            <PresencialVerificationBadge className="border-emerald-200/90 bg-emerald-50/96 text-emerald-950 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.14)]" />
          </div>
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

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-5 md:p-6">
        <div className="space-y-4">
          <div className="space-y-2 min-h-[5.15rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{propertyTypeLabel}</p>
            <h3 className="line-clamp-3 text-[1.24rem] font-semibold leading-[1.12] tracking-[-0.03em] text-slate-950 transition-colors duration-150 group-hover:text-slate-950 md:text-[1.34rem]">
              {property.title}
            </h3>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Por noche</p>
            <p className="text-[2.85rem] font-black leading-none tracking-[-0.06em] text-slate-950 md:text-[2.95rem]">
              {formatCurrency(Number(property.price) || 0)}
            </p>
          </div>

          <div
            data-testid="property-card-verification"
            aria-label={showPresencialBadge ? premiumVerificationTitle : standardVerificationSummary}
            className={cn('min-h-[5rem]', showPresencialBadge ? 'space-y-1' : 'space-y-2.5')}
          >
            {showPresencialBadge ? (
              <>
                <p className="text-[0.84rem] font-medium leading-5 text-slate-600">
                  {premiumVerificationTitle}
                </p>
                <p className="text-[0.76rem] leading-5 text-slate-500">
                  {premiumVerificationDescription}
                </p>
              </>
            ) : (
              <>
                <p className="text-[0.82rem] font-medium leading-5 text-slate-600">
                  {standardVerificationSummary}
                </p>

                {standardVerificationItems.length > 0 ? (
                  <ul className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Datos verificados">
                    {standardVerificationItems.map((item) => (
                      <li key={item.key} className="inline-flex items-center gap-1.5 text-[0.76rem] font-medium leading-5 text-slate-500">
                        <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-200/70 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.83rem] font-medium leading-5 text-slate-500">
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

          <span
            data-testid="property-card-cta"
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[0.76rem] font-semibold text-slate-600 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.12)] transition-[border-color,color,background-color] duration-150 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-900"
          >
            <span>{propertyCardCtaLabel}</span>
            <Icons.ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Card>
  );
};
