import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { LocationAutocomplete, type LocationSuggestion } from '../LocationAutocomplete';
import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { User } from '../../hooks/useAuth';

type ExploreHeroProps = {
  user: User | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchSubmitValue: (value: string) => void;
  onLocationSelect: (location: LocationSuggestion) => void;
};

export const ExploreHero = ({
  user,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  const navigate = useNavigate();

  const heroSignals = user
    ? [
        { label: 'Todo en orden', detail: 'Guardados, mensajes y reservas en un solo lugar.' },
        { label: 'Compará mejor', detail: 'Revisá ubicación, anfitrión y señales verificadas antes de reservar.' },
      ]
    : [
        { label: 'Propiedades verificadas', detail: 'Información real para tomar mejores decisiones.' },
        { label: 'Señales claras', detail: 'Identidad, ubicación y reseñas visibles desde el inicio.' },
      ];

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[#dbeafe] px-6 py-10 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.2)] md:px-12 md:py-14 lg:px-14 lg:py-16">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center opacity-100"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.16),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(92deg,rgba(248,250,252,0.96)_0%,rgba(248,250,252,0.84)_42%,rgba(248,250,252,0.18)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,40rem)_220px] lg:items-start lg:gap-x-12 lg:gap-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl space-y-6 md:space-y-7"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/72 px-3 py-1.5 app-eyebrow text-slate-700 backdrop-blur-md">
            <Icons.ShieldCheck className="h-4 w-4 text-brand" />
            Información real para decidir mejor
          </div>

          <h2 className="app-title-1 max-w-2xl">
            {user ? 'Tu próxima estadía en la costa empieza con información clara.' : 'Encontrá dónde alojarte en la Costa Atlántica con información real.'}
          </h2>

          <p className="app-eyebrow md:text-sm">
            Costa Atlántica argentina, propiedades verificadas y más contexto para decidir
          </p>

          <p className="app-body max-w-xl md:text-base">
            {user
              ? 'Retomá tu búsqueda, compará propiedades verificadas y revisá guardados, mensajes y reservas desde un solo lugar.'
              : 'Explorá propiedades frente al mar, compará ubicaciones y conocé al anfitrión antes de reservar.'}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              onClick={() => (user ? navigate('/my-bookings') : navigate('/register'))}
              className="rounded-full px-5 shadow-[0_20px_45px_-30px_rgba(79,70,229,0.7)]"
            >
              {user ? <Icons.Calendar className="h-4 w-4" /> : <Icons.ArrowRight className="h-4 w-4" />}
              {user ? 'Mis reservas' : 'Creá tu cuenta'}
            </Button>

            <Button
              type="button"
              onClick={() => navigate('/about')}
              variant="secondary"
              className="rounded-full border-slate-300/80 bg-white/70 px-5 text-slate-800 hover:border-slate-400 hover:bg-white"
            >
              <Icons.Info className="h-4 w-4" />
              Así funciona
            </Button>
          </div>
        </motion.div>

        <div className="hidden gap-4 lg:grid lg:self-start lg:pt-1">
          {heroSignals.map((item) => (
            <Card key={item.label} padding="sm" className="border-white/60 bg-white/58 text-slate-900 shadow-none backdrop-blur-md">
              <div className="app-eyebrow">{item.label}</div>
              <div className="app-body-sm mt-2">{item.detail}</div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-full">
          <div className="max-w-2xl">
            <Card padding="sm" className="app-surface border-white/8 bg-white/94 p-2.5 shadow-[0_26px_50px_-34px_rgba(15,23,42,0.45)] md:p-3.5">
              <form
                className="flex flex-col gap-3 md:flex-row md:items-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSearchSubmit();
                }}
              >
                <div className="flex-1">
                  <div className="app-eyebrow mb-2 hidden pl-1 md:block">Destino</div>
                  <LocationAutocomplete
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder="¿Dónde querés alojarte?"
                    onSelect={onLocationSelect}
                    onSubmitValue={onSearchSubmitValue}
                  />
                </div>

                <Button type="submit" className="rounded-2xl px-5 md:h-12">
                  <Icons.Search className="h-5 w-5" />
                  Buscar propiedades
                </Button>
              </form>
            </Card>

            <p className="mt-4 pl-1 text-sm text-slate-600">
              Escribí una ciudad, una playa o una zona. Después buscá y ajustá los filtros para comparar mejor.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;