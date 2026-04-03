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
  const imageSrc = property.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80';
  const rating = Number(property.rating || 0);
  const reviewsCount = Number(property.reviewsCount || 0);
  const isFavoritesVariant = variant === 'favorites';

  const imageBadge = property.isVerifiedProperty
    ? {
        label: 'Verificada',
        variant: 'brand' as const,
        icon: <Icons.ShieldCheck className="h-3.5 w-3.5" />,
        className: 'border-white/70 bg-white/95 text-brand shadow-sm',
      }
    : null;

  const trustSignals = [
    property.isSuperHost
      ? {
          label: 'Superanfitrión',
          variant: 'success' as const,
          icon: <Icons.Award className="h-3.5 w-3.5" />,
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : null,
    !property.isVerifiedProperty && property.identityValidated
      ? {
          label: 'Anfitrión validado',
          variant: 'neutral' as const,
          icon: <Icons.BadgeCheck className="h-3.5 w-3.5" />,
          className: 'border-slate-200 bg-slate-50 text-slate-700',
        }
      : null,
    !property.isVerifiedProperty && !property.identityValidated && property.locationVerified
      ? {
          label: 'Ubicación verificada',
          variant: 'info' as const,
          icon: <Icons.MapPin className="h-3.5 w-3.5" />,
          className: 'border-sky-200 bg-sky-50 text-sky-700',
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    variant: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
    icon: React.ReactNode;
    className: string;
  }>;

  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'Nuevo';
  const reviewLabel = reviewsCount > 0 ? `${reviewsCount} ${reviewsCount === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas';
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
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_28px_58px_-40px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15',
        isFavoritesVariant && 'bg-white shadow-[var(--app-shadow-soft)]',
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-slate-100 lg:aspect-[4/3]">
        <img 
          src={imageSrc} 
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
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

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleFavoriteToggle}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Quitar de guardados' : 'Guardar propiedad'}
            className={cn(
              'h-10 w-10 rounded-full border-white/70 bg-white/92 text-slate-700 shadow-[var(--app-shadow-subtle)] backdrop-blur-sm',
              isFavorite
                ? 'border-red-500 bg-red-500 text-white hover:border-red-500 hover:bg-red-500 hover:text-white'
                : 'hover:border-red-200 hover:bg-white hover:text-red-500',
            )}
          >
            <Icons.Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5 md:p-6">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Icons.MapPin className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">{property.location}</span>
          </p>
          <h3 className="line-clamp-2 text-[1.03rem] font-semibold leading-6 tracking-tight text-slate-950 transition-colors duration-200 group-hover:text-slate-900 sm:text-[1.08rem] md:text-lg">{property.title}</h3>
        </div>

        <Card padding="sm" variant="muted" className="rounded-[24px] border-slate-200/80 bg-slate-50/80">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Precio por noche</span>
              <div className="flex items-end gap-2">
                <span className="block text-[1.35rem] font-semibold tracking-tight text-slate-950 md:text-[1.5rem]">
                  {formatCurrency(Number(property.price) || 0)}
                </span>
                <span className="pb-1 text-sm text-slate-500">/ noche</span>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-right shadow-[var(--app-shadow-subtle)]">
              <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-900">
                <Icons.Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                {ratingLabel}
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{reviewLabel}</p>
            </div>
          </div>

          {guestLabel || property.hostName ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {guestLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Users className="h-4 w-4 text-slate-400" />
                  <span>{guestLabel}</span>
                </span>
              ) : null}
              {property.hostName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.UserCheck className="h-4 w-4 text-slate-400" />
                  <span>{property.hostName}</span>
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
          <p className="text-sm font-medium text-slate-500">Datos claros para decidir antes de reservar.</p>
          {onClick ? (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors duration-200 group-hover:text-brand">
              <span>{isFavoritesVariant ? 'Abrir detalle' : 'Ver detalle'}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[var(--app-shadow-subtle)] transition-[transform,border-color,color] duration-200 group-hover:translate-x-0.5 group-hover:border-brand/30 group-hover:text-brand">
                <Icons.ArrowRight className="h-4 w-4" />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
