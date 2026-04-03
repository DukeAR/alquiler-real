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
  const navigate = useNavigate();

  const heroTitle = user
    ? 'Retomá tu próxima estadía con información clara desde el primer vistazo.'
    : 'Encontrá Propiedades en la Costa Atlántica con información real desde el primer vistazo.';

  const heroDescription = user
    ? 'Volvé a tus búsquedas, compará zonas y revisá guardados, mensajes y Reservas sin perder el contexto.'
    : 'Explorá Propiedades frente al mar, compará zonas con más contexto y conocé al Anfitrión antes de Reservar.';

  const heroHighlights = user
    ? ['Guardados al día', 'Reservas en contexto', 'Comparación más clara']
    : ['Ubicación visible', 'Señales verificadas', 'Más contexto antes de Reservar'];

  const searchExamples = ['Pinamar', 'La Perla', 'Cariló'];

  const heroSignals = user
    ? [
        {
          label: 'Todo donde lo dejaste',
          detail: 'Guardados, mensajes y Reservas reunidos para seguir decidiendo sin fricción.',
          icon: Icons.Heart,
          iconClassName: 'bg-rose-100 text-rose-600',
        },
        {
          label: 'Compará con más contexto',
          detail: 'Ubicación, Anfitrión y señales verificadas visibles antes de volver a Reservar.',
          icon: Icons.Search,
          iconClassName: 'bg-sky-100 text-sky-700',
        },
      ]
    : [
        {
          label: 'Propiedades verificadas',
          detail: 'Información real para tomar mejores decisiones desde el primer vistazo.',
          icon: Icons.ShieldCheck,
          iconClassName: 'bg-emerald-100 text-emerald-700',
        },
        {
          label: 'Señales claras',
          detail: 'Ubicación, reseñas y contexto del Anfitrión visibles desde el inicio.',
          icon: Icons.MapPin,
          iconClassName: 'bg-amber-100 text-amber-700',
        },
      ];

  const comparisonChecklist = user
    ? ['Volvé a una zona sin perder contexto', 'Revisá señales reales antes de decidir', 'Seguí desde tus Reservas o guardados']
    : ['Ciudad, playa o zona en una sola búsqueda', 'Más señales visibles del Anfitrión y la Propiedad', 'Más contexto antes de pasar a Reservar'];

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-slate-200/80 bg-slate-950 px-6 py-8 shadow-[0_34px_80px_-46px_rgba(15,23,42,0.32)] md:px-10 md:py-12 lg:px-12 lg:py-14">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center opacity-95"
        />
        <div className="absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-amber-200/45 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(248,250,252,0.98)_0%,rgba(248,250,252,0.92)_36%,rgba(248,250,252,0.64)_62%,rgba(15,23,42,0.16)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 md:space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 backdrop-blur-md">
            <Icons.ShieldCheck className="h-4 w-4 text-brand" />
            Información real para decidir mejor
          </div>

          <div className="space-y-4">
            <div className="app-eyebrow">Costa Atlántica argentina, Propiedades verificadas y más contexto para decidir</div>
            <h2 className="app-title-1 max-w-3xl">{heroTitle}</h2>
            <p className="max-w-2xl text-[15px] leading-7 text-slate-700 md:text-base md:leading-8">
              {heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {heroHighlights.map((highlight) => (
              <span
                key={highlight}
                className="inline-flex items-center rounded-full border border-white/80 bg-white/74 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm"
              >
                {highlight}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => (user ? navigate('/my-bookings') : navigate('/register'))}
              className="rounded-full px-6 shadow-[0_22px_50px_-30px_rgba(79,70,229,0.7)]"
            >
              {user ? <Icons.Calendar className="h-4 w-4" /> : <Icons.ArrowRight className="h-4 w-4" />}
              {user ? 'Mis Reservas' : 'Creá tu cuenta'}
            </Button>

            <Button
              type="button"
              onClick={() => navigate('/about')}
              variant="secondary"
              className="rounded-full border-white/80 bg-white/76 px-5 text-slate-800 hover:border-white hover:bg-white"
            >
              <Icons.Info className="h-4 w-4" />
              Así funciona
            </Button>
          </div>

          <Card padding="none" className="overflow-hidden border-white/80 bg-white/95 p-4 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.36)] md:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="app-eyebrow">Búsqueda inicial</div>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-900 md:text-xl">
                    Buscá por ciudad, playa o zona
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 md:text-[15px]">
                    Empezá por el lugar que te interesa y después ajustá filtros para comparar mejor.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600">
                  Más claridad desde el primer paso
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
                    placeholder="¿Dónde querés alojarte?"
                    onSelect={onLocationSelect}
                    onSubmitValue={onSearchSubmitValue}
                  />
                </div>

                <Button type="submit" className="w-full rounded-[22px] px-6 md:h-14 md:w-auto md:min-w-[220px]">
                  <Icons.Search className="h-5 w-5" />
                  Buscar Propiedades
                </Button>
              </form>

              <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-600">
                  Escribí un destino y después filtrá por precio, tipo de propiedad o verificación.
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Probá con</span>
                  {searchExamples.map((example) => (
                    <span
                      key={example}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:pt-2">
          {heroSignals.map((item) => {
            const SignalIcon = item.icon;

            return (
              <Card
                key={item.label}
                padding="sm"
                className="border-white/80 bg-white/78 text-slate-900 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.25)] backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                    <SignalIcon className="h-5 w-5" />
                  </span>

                  <div>
                    <div className="app-eyebrow">{item.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</div>
                  </div>
                </div>
              </Card>
            );
          })}

          <Card padding="sm" className="border-slate-900/5 bg-slate-950/78 text-white shadow-[0_28px_60px_-36px_rgba(15,23,42,0.42)]">
            <div className="app-eyebrow text-white/60">Qué vas a poder comparar</div>
            <div className="mt-3 space-y-3">
              {comparisonChecklist.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-6 text-white/86">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/90">
                    <Icons.Check className="h-3 w-3" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        </div>
          </div>
    </section>
  );
};

export default ExploreHero;