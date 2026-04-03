import { motion } from 'motion/react';
import { LocationAutocomplete, type LocationSuggestion } from '../LocationAutocomplete';
import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { User } from '../../hooks/useAuth';

type ExploreHeroProps = {
  user: User | null;
  searchValue: string;
  locationSuggestions: LocationSuggestion[];
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchSubmitValue: (value: string) => void;
  onLocationSelect: (location: LocationSuggestion) => void;
};

export const ExploreHero = ({
  user,
  searchValue,
  locationSuggestions,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  const heroTitle = user
    ? 'Encontrá tu próxima estadía con información real.'
    : 'Encontrá alojamientos en la costa con información real.';

  const heroDescription = user
    ? 'Volvé a buscar, compará zonas y seguí tus Reservas sin perder contexto.'
    : 'Compará ubicación, anfitrión y reseñas reales antes de reservar.';

  const trustSignals = [
    { icon: Icons.BadgeCheck, label: 'Propiedades verificadas' },
    { icon: Icons.MessageSquare, label: 'Reseñas reales' },
    { icon: Icons.ShieldCheck, label: 'Datos claros antes de reservar' },
  ];

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-slate-200/80 bg-slate-950 px-6 py-10 shadow-[0_34px_80px_-46px_rgba(15,23,42,0.28)] md:px-10 md:py-14 lg:px-12 lg:py-16">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center opacity-95"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(248,250,252,0.98)_0%,rgba(248,250,252,0.93)_42%,rgba(248,250,252,0.72)_68%,rgba(248,250,252,0.18)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-5 md:space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 backdrop-blur-md">
            <Icons.ShieldCheck className="h-4 w-4 text-brand" />
            Información real para tomar mejores decisiones
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="app-eyebrow">Costa Atlántica argentina</div>
            <h1 className="max-w-3xl text-balance text-[2.45rem] font-semibold leading-[0.96] tracking-[-0.055em] text-slate-950 md:text-[4.15rem]">
              {heroTitle}
            </h1>
            <p className="max-w-2xl text-[15px] leading-7 text-slate-700 md:text-lg md:leading-8">
              {heroDescription}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 md:mt-10"
        >
          <Card padding="none" className="overflow-hidden rounded-[30px] border-white/85 bg-white/96 p-4 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.34)] md:p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-2 border-b border-slate-200/80 pb-4">
                <div>
                  <div className="app-eyebrow">Buscá por destino</div>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-900 md:text-xl">
                    Ciudad, playa o zona
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 md:text-[15px]">
                    Empezá por el lugar que te interesa. Después filtrá para comparar mejor.
                  </p>
                </div>
              </div>

              <form
                className="flex flex-col gap-3 md:flex-row md:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSearchSubmit();
                }}
              >
                <div className="flex-1">
                  <div className="app-eyebrow mb-2 pl-1">Destino</div>
                  <LocationAutocomplete
                    value={searchValue}
                    suggestions={locationSuggestions}
                    onChange={onSearchChange}
                    placeholder="Ciudad, playa o zona"
                    onSelect={onLocationSelect}
                    onSubmitValue={onSearchSubmitValue}
                  />
                </div>

                <Button type="submit" className="w-full rounded-[22px] px-6 md:h-14 md:w-auto md:min-w-[220px]">
                  <Icons.Search className="h-5 w-5" />
                  Buscar propiedades
                </Button>
              </form>

              <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-600">
                  Probá con Pinamar, Cariló o La Perla si querés arrancar rápido.
                </p>
                <p className="text-sm text-slate-500">
                  Compará por precio, tipo de propiedad y verificación.
                </p>
              </div>
            </div>
          </Card>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
            {trustSignals.map((item) => {
              const SignalIcon = item.icon;

              return (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <SignalIcon className="h-4 w-4 text-brand" />
                  <span>{item.label}</span>
                </span>
              );
            })}
          </div>

          {user ? (
            <p className="mt-3 text-sm text-slate-600">
              También podés seguir desde Guardados y Reservas cuando quieras.
            </p>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
};

export default ExploreHero;