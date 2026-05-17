import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import { sortPropertiesByCatalogOrder } from '../lib/propertyVerification';
import { Property } from '../services/geminiService';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { PropertyCard } from './PropertyCard';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SectionTitle } from './ui/SectionTitle';

const isResolvedProperty = (value: unknown): value is Property => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Property>;
  return typeof candidate.id === 'string' && typeof candidate.title === 'string' && candidate.title.trim().length > 0;
};

export const FavoritesView: React.FC = () => {
  const navigate = useNavigate();
  const { favoritesMap, toggleFavorite, isFavorite, isLoading, markFavoritesAsSeen, clearAllFavorites } = useFavorites();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [recentRemoval, setRecentRemoval] = useState<{ id: string; title: string } | null>(null);
  const removalTimeoutRef = useRef<number | null>(null);

  const favoriteEntries = Array.from(favoritesMap.values()).filter(Boolean);
  const properties = favoriteEntries.filter(isResolvedProperty);
  const sortedProperties = sortPropertiesByCatalogOrder(properties, 'verification');
  const pendingFavoritesCount = favoriteEntries.length - properties.length;

  useEffect(() => {
    markFavoritesAsSeen();
  }, [favoritesMap, markFavoritesAsSeen]);

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current) {
        window.clearTimeout(removalTimeoutRef.current);
      }
    };
  }, []);

  const dismissRemovalFeedback = () => {
    if (removalTimeoutRef.current) {
      window.clearTimeout(removalTimeoutRef.current);
      removalTimeoutRef.current = null;
    }

    setRecentRemoval(null);
  };

  const showRemovalFeedback = (property: Property) => {
    if (removalTimeoutRef.current) {
      window.clearTimeout(removalTimeoutRef.current);
    }

    setRecentRemoval({ id: property.id, title: property.title });
    removalTimeoutRef.current = window.setTimeout(() => {
      setRecentRemoval(null);
      removalTimeoutRef.current = null;
    }, 5000);
  };

  const handleFavoriteToggle = async (property: Property, nextFavoriteState: boolean) => {
    const result = await toggleFavorite(property.id);

    if (!nextFavoriteState && result === 'removed') {
      setConfirmingClear(false);
      showRemovalFeedback(property);
    }
  };

  const handleUndoRemoval = async () => {
    if (!recentRemoval) {
      return;
    }

    const { id } = recentRemoval;
    dismissRemovalFeedback();
    await toggleFavorite(id);
  };

  const handleClearAll = async () => {
    dismissRemovalFeedback();
    setConfirmingClear(false);
    await clearAllFavorites();
  };

  if (isLoading) return <LoadingState message="Cargando tus guardados..." />;

  if (!properties.length && pendingFavoritesCount > 0) {
    return <LoadingState message="Estamos sincronizando tus últimos guardados..." />;
  }

  if (properties.length === 0) {
    return (
      <div className="app-page py-10 md:py-14">
        <EmptyState
          eyebrow="Guardados"
          tone="soft"
          visual={
            <div className="relative">
              <Icons.Heart className="h-12 w-12 text-brand" />
              <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-[var(--app-shadow-brand)]">
                <Icons.Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
          }
          title="Todavía no guardaste propiedades"
          description="Cuando encuentres una que quieras revisar con más tiempo, guardala y la vas a tener siempre a mano acá."
          action={{
            label: 'Explorá propiedades',
            onClick: () => navigate('/')
          }}
          secondaryAction={{
            label: 'Cómo funciona',
            onClick: () => navigate('/about'),
            variant: 'secondary',
          }}
        />
      </div>
    );
  }

  const favoritesCountLabel = properties.length === 1 ? '1 propiedad guardada' : `${properties.length} propiedades guardadas`;

  return (
    <div className="app-page py-5 md:py-8">
      <div className="space-y-5 md:space-y-8">
        <Card
          variant="elevated"
          padding="none"
          className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-4 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.34)] sm:p-5 md:p-7 md:shadow-[0_30px_70px_-42px_rgba(15,23,42,0.38)]"
        >
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="brand" size="md">
                  <Icons.Heart className="h-3.5 w-3.5 fill-current" />
                  Guardados
                </Badge>
                <Badge variant="neutral" size="md">{favoritesCountLabel}</Badge>
                {pendingFavoritesCount > 0 ? (
                  <Badge variant="info" size="md">
                    <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sincronizando {pendingFavoritesCount}
                  </Badge>
                ) : null}
              </div>

              <SectionTitle
                eyebrow="Tu shortlist"
                heading="Tus propiedades guardadas, mejor organizadas."
                description="Compará con calma, retomá lo que te interesó y revisá primero las que ya muestran verificación presencial."
                as="h1"
                visualLevel="h2"
                className="max-w-3xl"
              />
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap lg:justify-end">
              <Button type="button" variant="ghost" onClick={() => navigate('/')} className="w-full justify-center sm:w-auto">
                <Icons.Search className="h-4 w-4" />
                Seguir explorando
              </Button>
              {confirmingClear ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => setConfirmingClear(false)} className="w-full justify-center sm:w-auto">
                    Cancelar
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void handleClearAll()} className="w-full justify-center sm:w-auto">
                    Confirmar vaciado
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setConfirmingClear(true)} className="w-full justify-center sm:w-auto">
                  <Icons.X className="h-4 w-4" />
                  Vaciar guardados
                </Button>
              )}
            </div>
          </div>
        </Card>

        {recentRemoval ? (
          <Card
            variant="muted"
            padding="none"
            role="status"
            aria-live="polite"
            className="border-brand/10 bg-brand/5 p-3.5 shadow-[var(--app-shadow-subtle)] sm:p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] bg-white text-brand shadow-[var(--app-shadow-subtle)] sm:h-10 sm:w-10 sm:rounded-2xl">
                  <Icons.Check className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[0.92rem] font-semibold tracking-tight text-slate-900 sm:text-sm">Quitamos una propiedad de tus guardados.</p>
                  <p className="line-clamp-1 text-[0.88rem] text-slate-600 sm:text-sm">{recentRemoval.title}</p>
                  <p className="text-[0.88rem] text-slate-600 sm:text-sm">Si fue sin querer, podés deshacerlo ahora mismo.</p>
                </div>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Button type="button" variant="secondary" size="sm" onClick={() => void handleUndoRemoval()} className="w-full justify-center sm:w-auto">
                  Deshacer
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={dismissRemovalFeedback} className="w-full justify-center sm:w-auto">
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {sortedProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              variant="favorites"
              isFavorite={isFavorite(property.id)}
              onFavoriteToggle={(_, nextFavoriteState) => handleFavoriteToggle(property, nextFavoriteState)}
              onClick={() => navigate(`/detail/${property.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
