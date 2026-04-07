import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE, getPropertyVerificationBadge } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { Badge } from './ui/Badge';
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
  if (explicitType.includes('cabin') || explicitType.includes('caba')) return 'Cabaña';

  const title = normalizePropertyText(property.title);

  if (title.includes('casa')) return 'Casa';
  if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'Casa';
  if (title.includes('monoambiente')) return 'Departamento';
  if (title.includes('depto') || title.includes('depart')) return 'Departamento';
  if (title.includes('caba')) return 'Cabaña';

  return 'Alojamiento';
};

const formatReviewCount = (count: number) => {
  if (count <= 0) {
    return 'Sin reseñas';
  }

  return count === 1 ? '1 reseña' : `${count} reseñas`;
};

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
  const rating = Number(property.rating || 0);
  const reviewsCount = Number(property.reviewsCount || 0);
  const isFavoritesVariant = variant === 'favorites';
  const verificationBadge = getPropertyVerificationBadge(property);
  const shouldEmphasizeVerification = emphasizeVerification && !isFavoritesVariant;
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const verificationTagLabel = !isFavoritesVariant && verificationBadge.score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE
    ? verificationGuidanceLabel || 'Más verificado'
    : null;

  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'Sin puntaje';

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
            <Badge
              variant="neutral"
              size="sm"
              className="border-white/70 bg-white/94 text-slate-700 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.26)] backdrop-blur-sm"
            >
              {verificationTagLabel}
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

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5 md:p-6">
        <div className="space-y-2.5">
          <p className="line-clamp-1 text-[12.5px] font-semibold leading-5 tracking-[0.01em] text-slate-500">
            <span>{propertyTypeLabel}</span>
            <span className="mx-1.5 text-slate-300"> {'·'} </span>
            <span className="text-slate-600">{property.location}</span>
          </p>
          <h3 className="line-clamp-2 text-[1.04rem] font-semibold leading-[1.35] tracking-[-0.02em] text-slate-950 transition-colors duration-150 group-hover:text-slate-950 sm:text-[1.08rem] md:text-[1.12rem]">{property.title}</h3>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[1.55rem] font-black leading-none tracking-[-0.04em] text-slate-950 md:text-[1.75rem]">
              {formatCurrency(Number(property.price) || 0)}
              {' '}
              <span className="text-sm font-medium tracking-normal text-slate-500">por noche</span>
            </p>
          </div>

          <div className="shrink-0 pt-0.5 text-right">
            <div className="inline-flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-900">
              <Icons.Star className="h-4 w-4 fill-brand text-brand" />
              <span>{ratingLabel}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500">{formatReviewCount(reviewsCount)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <p className={cn(
              'text-[11px] font-medium leading-5 text-slate-500',
              shouldEmphasizeVerification && 'text-emerald-700',
            )}>Nivel de verificación</p>
            <p className={cn(
              'mt-0.5 text-[13px] font-semibold leading-5 text-slate-900',
              shouldEmphasizeVerification && 'text-emerald-900',
            )}>
              {verificationBadge.label}
            </p>
          </div>

          <span
            aria-label={verificationBadge.summaryLabel}
            className={cn(
              'shrink-0 font-mono text-[11px] font-semibold tracking-[0.14em]',
              shouldEmphasizeVerification ? 'text-emerald-700' : 'text-slate-500',
            )}
          >
            {verificationBadge.visual}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-end gap-4 border-t border-slate-100/90 pt-4">
          {onClick ? (
            <div className="inline-flex items-center gap-2 text-[13.5px] font-semibold tracking-[-0.01em] text-slate-700 transition-colors duration-150 group-hover:text-slate-950">
              <span>{isFavoritesVariant ? 'Abrir detalle' : 'Ver detalle'}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18)] transition-[transform,border-color,color,box-shadow] duration-150 group-hover:translate-x-0.5 group-hover:border-slate-300 group-hover:text-slate-950 group-hover:shadow-[0_16px_28px_-22px_rgba(15,23,42,0.22)]">
                <Icons.ArrowRight className="h-4 w-4" />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
