import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE, getPropertyVerificationBadge, getPropertyVerificationItems } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { Button } from './ui/Button';
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
  location: 'Ubicación',
  identity: 'Anfitrión',
  photos: 'Fotos',
  video: 'Video',
  basics: 'Datos',
};

const getVerificationHighlightLabel = (key: string, fallbackLabel: string) => (
  verificationHighlightLabels[key] || fallbackLabel
);

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (propertyId: string, isFavorite: boolean) => void | Promise<unknown>;
  variant?: 'default' | 'favorites';
  verificationGuidanceLabel?: string | null;
  emphasizeVerification?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick,
  isFavorite = false,
  onFavoriteToggle,
  variant = 'default',
  verificationGuidanceLabel = null,
  emphasizeVerification = false,
}) => {
  const auth = useAuth();
  const user = auth.user;
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const isFavoritesVariant = variant === 'favorites';
  const verificationBadge = getPropertyVerificationBadge(property);
  const shouldEmphasizeVerification = emphasizeVerification && !isFavoritesVariant;
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const guestCapacityLabel = getGuestCapacityLabel(Number(property.maxGuests) || null);
  const verificationTagLabel = !isFavoritesVariant && verificationBadge.score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE
    ? verificationGuidanceLabel || 'Más comprobado'
    : null;
  const verificationHighlights = getPropertyVerificationItems(property)
    .filter((item) => item.status === 'complete')
    .sort((left, right) => {
      const leftPriority = verificationHighlightPriority[left.key] ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = verificationHighlightPriority[right.key] ?? Number.MAX_SAFE_INTEGER;

      return leftPriority - rightPriority;
    })
    .slice(0, 3)
    .map((item) => ({
      key: item.key,
      label: getVerificationHighlightLabel(item.key, item.label),
    }));

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
        'group flex h-full flex-col overflow-hidden border-slate-200/80 bg-white/98 transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out',
        onClick && 'cursor-pointer hover:-translate-y-[2px] hover:border-slate-300/90 hover:shadow-[0_28px_48px_-34px_rgba(15,23,42,0.24)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/10',
        isFavoritesVariant && 'bg-white shadow-[var(--app-shadow-soft)]',
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
          {verificationTagLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/96 px-3 py-1.5 text-[11px] font-semibold tracking-[0.01em] text-slate-800 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.26)] backdrop-blur-sm">
              <Icons.ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{verificationTagLabel}</span>
            </span>
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

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5 md:p-6">
        <div className="space-y-3">
          <p className="eyebrow">{propertyTypeLabel}</p>
          <h3 className="section-title line-clamp-2 transition-colors duration-150 group-hover:text-slate-950">{property.title}</h3>
          <div className="flex flex-wrap gap-2.5 body-sm text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1.5">
              <Icons.MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{property.location}</span>
            </span>
            {guestCapacityLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1.5">
                <Icons.Users className="h-3.5 w-3.5 text-slate-400" />
                <span>{guestCapacityLabel}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[1.75rem] font-black leading-none tracking-[-0.045em] text-slate-950 md:text-[2rem]">
            {formatCurrency(Number(property.price) || 0)}
            {' '}
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">por noche</span>
          </p>

          <div
            aria-label={verificationBadge.label}
            className={cn(
              'rounded-[calc(var(--app-radius-control)+2px)] border border-slate-200/85 bg-slate-50/85 p-3.5',
              shouldEmphasizeVerification && 'border-emerald-200/80 bg-emerald-50/65',
            )}
          >
            <div className="space-y-2.5">
              <p className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500',
                shouldEmphasizeVerification && 'text-emerald-700',
              )}>
                Validado en este aviso
              </p>

              {verificationHighlights.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {verificationHighlights.map((item) => (
                    <span
                      key={item.key}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold tracking-[-0.01em] text-slate-700',
                        shouldEmphasizeVerification && 'border-emerald-200/90 text-emerald-800',
                      )}
                    >
                      <Icons.Check className={cn(
                        'h-3.5 w-3.5 text-emerald-600',
                        shouldEmphasizeVerification && 'text-emerald-700',
                      )} />
                      <span>{item.label}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-5 text-slate-600">Todavía sin validaciones visibles</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-end pt-1">
          {onClick ? (
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18)] transition-[transform,border-color,color,box-shadow] duration-150 group-hover:translate-x-0.5 group-hover:border-slate-300 group-hover:text-slate-950 group-hover:shadow-[0_16px_28px_-22px_rgba(15,23,42,0.22)]"
            >
                <Icons.ArrowRight className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
