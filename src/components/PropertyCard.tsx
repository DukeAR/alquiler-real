import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { cn, formatCurrency } from '../lib/utils';
import { Property } from '../services/geminiService';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (propertyId: string, isFavorite: boolean) => void | Promise<unknown>;
  variant?: 'default' | 'favorites';
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick,
  isFavorite = false,
  onFavoriteToggle,
  variant = 'default',
}) => {
  const auth = useAuth();
  const user = auth.user;
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const rating = Number(property.rating || 0);
  const reviewsCount = Number(property.reviewsCount || 0);
  const isFavoritesVariant = variant === 'favorites';

  const imageBadge = property.locationVerified
    ? {
        label: 'Ubicación verificada',
        variant: 'success' as const,
        icon: <Icons.ShieldCheck className="h-3.5 w-3.5" />,
        className: 'border-emerald-200/80 bg-white/95 text-emerald-700 shadow-sm',
      }
    : property.identityValidated
      ? {
          label: 'Identidad confirmada',
          variant: 'success' as const,
          icon: <Icons.BadgeCheck className="h-3.5 w-3.5" />,
          className: 'border-emerald-200/80 bg-white/95 text-emerald-700 shadow-sm',
        }
    : null;

  const trustSignals = [
    property.isSuperHost
      ? {
          label: 'Anfitrión con historial',
          variant: 'brand' as const,
          icon: <Icons.Award className="h-3.5 w-3.5" />,
          className: 'border-brand/15 bg-brand/10 text-brand-dark dark:border-brand/20 dark:bg-brand/15 dark:text-brand-light',
        }
      : null,
    !property.isVerifiedProperty && property.identityValidated
      ? {
          label: 'Identidad confirmada',
          variant: 'success' as const,
          icon: <Icons.BadgeCheck className="h-3.5 w-3.5" />,
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : null,
    !property.isVerifiedProperty && !property.identityValidated && property.locationVerified
      ? {
          label: 'Ubicación verificada',
          variant: 'success' as const,
          icon: <Icons.MapPin className="h-3.5 w-3.5" />,
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    variant: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
    icon: React.ReactNode;
    className: string;
  }>;

  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'Sin puntaje';
  const reviewLabel = reviewsCount > 0 ? `${reviewsCount} ${reviewsCount === 1 ? 'reseña real' : 'reseñas reales'}` : 'Sin reseñas todavía';
  const guestLabel = property.maxGuests ? `${property.maxGuests} ${property.maxGuests === 1 ? 'huésped' : 'huéspedes'}` : null;

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
        onClick && 'cursor-pointer hover:-translate-y-[1px] hover:border-slate-300/90 hover:shadow-[0_24px_46px_-34px_rgba(15,23,42,0.24)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/10',
        isFavoritesVariant && 'bg-white shadow-[var(--app-shadow-soft)]',
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-slate-100 lg:aspect-[4/3]">
        <img 
          src={imageSrc} 
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.018]"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/18 via-slate-950/5 to-transparent" />
        
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-wrap gap-2">
            {imageBadge ? (
              <Badge variant={imageBadge.variant} size="md" className={imageBadge.className}>
                {imageBadge.icon}
                {imageBadge.label}
              </Badge>
            ) : null}
          </div>

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
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold leading-5 tracking-[0.01em] text-slate-600">
            <Icons.MapPin className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">{property.location}</span>
          </p>
          <h3 className="line-clamp-2 text-[1.04rem] font-semibold leading-[1.35] tracking-[-0.02em] text-slate-950 transition-colors duration-150 group-hover:text-slate-950 sm:text-[1.08rem] md:text-[1.12rem]">{property.title}</h3>
        </div>

        <Card padding="sm" variant="muted" className="rounded-[22px] border-slate-200/80 bg-slate-50/80">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Precio por noche</span>
              <div className="flex items-end gap-2">
                <span className="block text-[1.32rem] font-semibold tracking-[-0.03em] text-slate-950 md:text-[1.46rem]">
                  {formatCurrency(Number(property.price) || 0)}
                </span>
                <span className="pb-1 text-xs font-medium text-slate-500">/ noche</span>
              </div>
            </div>

            <div className="shrink-0 rounded-[20px] border border-slate-200/80 bg-white/96 px-3 py-2 text-right shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-900">
                <Icons.Star className="h-4 w-4 fill-brand text-brand" />
                {ratingLabel}
              </div>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">{reviewLabel}</p>
            </div>
          </div>

          {guestLabel || property.hostName ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
              {guestLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Users className="h-4 w-4 text-slate-400" />
                  <span>{guestLabel}</span>
                </span>
              ) : null}
              {property.hostName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.UserCheck className="h-4 w-4 text-slate-400" />
                  <span>Anfitrión: {property.hostName}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </Card>

        {trustSignals.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-500">
            {trustSignals.map((signal) => (
              <Badge key={signal.label} variant={signal.variant} size="md" className={signal.className}>
                {signal.icon}
                {signal.label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100/90 pt-4">
          <p className="text-[13px] font-medium leading-6 text-slate-500">Revisá ubicación, precio y verificación antes de decidir.</p>
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
