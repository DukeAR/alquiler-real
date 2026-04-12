import { LocationAutocomplete, type LocationSuggestion } from '../LocationAutocomplete';
import { Button } from '../ui/Button';

type ExploreHeroProps = {
  searchValue: string;
  locationSuggestions: LocationSuggestion[];
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchSubmitValue: (value: string) => void;
  onLocationSelect: (location: LocationSuggestion) => void;
};

const trustLine = 'Revisá ubicación, quién publica y qué ya fue comprobado antes de reservar.';
const heroSubtitle = 'Elegí con información real antes de reservar.';

export const ExploreHero = ({
  searchValue,
  locationSuggestions,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  return (
    <section
      className="relative overflow-hidden rounded-[var(--app-radius-display)] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.94)_42%,rgba(241,245,249,0.88)_100%)] px-5 py-6 shadow-[var(--app-shadow-soft)] sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-10 lg:py-12"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full max-w-[42rem] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full scale-[1.04] object-cover object-center opacity-30 saturate-[0.68] contrast-[0.86] blur-[2px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.98)_28%,rgba(255,255,255,0.78)_58%,rgba(255,255,255,0.92)_100%)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(165,180,252,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_34%)]" />

      <div className="relative z-10 flex flex-col gap-8 md:gap-10">
        <div className="max-w-[42rem] space-y-4 md:space-y-5">
          <p className="app-eyebrow text-brand">Elegir mejor</p>
          <div className="space-y-3 md:space-y-4">
            <h1 className="font-display max-w-[18rem] text-balance text-[2.35rem] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-950 sm:max-w-[28rem] sm:text-[3.2rem] md:max-w-[36rem] md:text-[4.35rem] lg:max-w-[40rem] lg:text-[4.8rem]">
              Reservar es fácil.
              <br />
              Decidir bien no siempre.
            </h1>
            <p className="max-w-[31rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.02rem] md:max-w-[34rem] md:text-[1.1rem] md:leading-8">
              {heroSubtitle}
            </p>
          </div>
        </div>

        <form
          className="w-full max-w-[46rem] rounded-[var(--app-radius-card)] border border-slate-200/80 bg-white p-4 shadow-[0_28px_52px_-36px_rgba(15,23,42,0.24)] sm:p-5 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="flex flex-col gap-4 md:gap-5">
            <div className="space-y-1.5">
              <p className="app-eyebrow text-slate-500">Buscador principal</p>
              <p className="max-w-[36rem] text-sm leading-6 text-slate-600">
                Buscá por zona o ciudad y revisá opciones con contexto real desde el primer vistazo.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="flex-1 space-y-2.5">
                <label htmlFor="explore-destination" className="app-form-label block text-slate-500">
                  Zona o ciudad
                </label>
                <LocationAutocomplete
                  inputId="explore-destination"
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="¿A dónde querés ir?"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-16 w-full px-6 text-[0.98rem] shadow-[var(--app-shadow-brand)] lg:min-w-[220px] lg:w-auto lg:flex-none"
              >
                Ver alojamientos
              </Button>
            </div>
          </div>
        </form>

        <p className="max-w-[34rem] text-sm leading-6 text-slate-600 md:text-[0.95rem] md:leading-6">
          {trustLine}
        </p>
      </div>
    </section>
  );
};

export default ExploreHero;