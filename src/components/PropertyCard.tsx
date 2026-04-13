import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE, getPropertyVerificationBadge, getPropertyVerificationItems } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

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

const verificationHighlightPriority: Record<string, number> = {
  location: 0,
  identity: 1,
  photos: 2,
  video: 3,
  basics: 4,
};

const verificationHighlightLabels: Record<string, string> = {
  location: 'Ubicación verificada',
  identity: 'Anfitrión',
  photos: 'Datos',
  video: 'Datos',
  basics: 'Datos',
};

const getVerificationHighlightLabel = (key: string, fallbackLabel: string) => (
  verificationHighlightLabels[key] || fallbackLabel
);

const getCompactVerificationHighlights = (property: Property) => {
  const seenLabels = new Set<string>();

  return getPropertyVerificationItems(property)
    .filter((item) => item.status === 'complete')
    .sort((left, right) => {
      const leftPriority = verificationHighlightPriority[left.key] ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = verificationHighlightPriority[right.key] ?? Number.MAX_SAFE_INTEGER;

      return leftPriority - rightPriority;
    })
    .reduce<Array<{ key: string; label: string }>>((accumulator, item) => {
      const label = getVerificationHighlightLabel(item.key, item.label);

      if (seenLabels.has(label)) {
        return accumulator;
      }

      seenLabels.add(label);
      accumulator.push({ key: item.key, label });
      return accumulator;
    }, [])
    .slice(0, 3);
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
  verificationGuidanceLabel = null,
  emphasizeVerification = false,
  decisionFeatured = false,
  decisionSupportLabel = null,
  className,
}) => {
  const auth = useAuth();
  const user = auth.user;
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const isFavoritesVariant = variant === 'favorites';
  const isDecisionFeatured = decisionFeatured && !isFavoritesVariant;
  const verificationBadge = getPropertyVerificationBadge(property);
  const shouldEmphasizeVerification = emphasizeVerification && !isFavoritesVariant;
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const guestCapacityLabel = getGuestCapacityLabel(Number(property.maxGuests) || null);
  const verificationTagLabel = !isFavoritesVariant && !isDecisionFeatured && verificationBadge.score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE
    ? verificationGuidanceLabel || 'Más comprobado'
    : null;
  const verificationHighlights = getCompactVerificationHighlights(property);

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
        isDecisionFeatured && 'border-brand/20 shadow-[0_22px_42px_-32px_rgba(67,56,202,0.22)]',
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
        
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          {isDecisionFeatured ? (
            <Badge variant="neutral" size="md" className="border-brand/15 bg-white/96 px-3 py-1.5 text-slate-950 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.22)] backdrop-blur-sm">
              <span>Mejor opción</span>
            </Badge>
          ) : verificationTagLabel ? (
            <Badge variant="neutral" size="md" className="border-white/75 bg-white/96 px-3 py-1.5 text-slate-900 shadow-[var(--app-shadow-subtle)] backdrop-blur-sm">
              <span>{verificationTagLabel}</span>
            </Badge>
          ) : (
            <span />
          )}

          {user ? (
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
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-5 sm:p-5 md:p-6">
        <div className="space-y-4">
          <p className="eyebrow">{propertyTypeLabel}</p>
          <h3 className="section-title line-clamp-2 transition-colors duration-150 group-hover:text-slate-950">{property.title}</h3>
          <div className="flex flex-wrap items-center gap-y-1.5 text-sm leading-6 text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Icons.MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{property.location}</span>
            </span>
            {guestCapacityLabel ? (
              <>
                <span aria-hidden="true" className="px-2 text-slate-300">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{guestCapacityLabel}</span>
                </span>
              </>
            ) : null}
          </div>
        </div>

        {verificationHighlights.length > 0 ? (
          <div
            data-testid="property-card-trust-line"
            aria-label={verificationBadge.label}
            className={cn('flex flex-wrap items-center gap-y-1.5 text-sm leading-6', shouldEmphasizeVerification && 'text-emerald-800')}
          >
            {verificationHighlights.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 ? <span aria-hidden="true" className="px-2 text-slate-300">·</span> : null}
                <span className={cn('inline-flex items-center gap-1.5 font-medium text-slate-600', shouldEmphasizeVerification && 'text-emerald-800')}>
                  <Icons.Check className={cn('h-3.5 w-3.5 shrink-0 text-emerald-600', shouldEmphasizeVerification && 'text-emerald-700')} />
                  <span>{item.label}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p data-testid="property-card-trust-line" aria-label={verificationBadge.label} className="text-sm leading-6 text-slate-600">Todavía sin validaciones visibles</p>
        )}

        {!isFavoritesVariant && decisionSupportLabel ? (
          <p className={cn(
            'text-sm leading-6',
            isDecisionFeatured ? 'font-medium text-slate-700' : 'text-slate-600',
          )}>
            {decisionSupportLabel}
          </p>
        ) : null}

        <div className="mt-auto border-t border-slate-200/70 pt-5">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Por noche</p>
            <p className="text-[2.8rem] font-black leading-none tracking-[-0.06em] text-slate-950 md:text-[3rem]">
              {formatCurrency(Number(property.price) || 0)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
