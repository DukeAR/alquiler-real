import { Icons } from '../Icons';
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

const heroSubtitle = 'Elegí con información real antes de reservar.';
const heroBackgroundImage = 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80';
const valueProofItems = [
  'Ubicación verificada',
  'Anfitrión identificado',
  'Datos comprobados',
] as const;

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
      className="relative overflow-hidden rounded-[var(--app-radius-display)] border border-slate-200/80 px-5 py-8 shadow-[var(--app-shadow-soft)] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-14"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-[-2%] scale-[1.03]"
          style={{
            backgroundImage: `url(${heroBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(3px) saturate(0.72) contrast(0.9)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(248,250,252,0.8)_48%,rgba(255,255,255,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(165,180,252,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.16),transparent_34%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[45rem] flex-col items-center gap-8 text-center md:gap-10">
        <div className="max-w-[42rem] space-y-4 md:space-y-5">
          <p className="app-eyebrow text-brand">Elegir mejor</p>
          <div className="space-y-3 md:space-y-4">
            <h1 className="font-display mx-auto max-w-[18rem] text-balance text-[2.35rem] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-950 sm:max-w-[28rem] sm:text-[3.2rem] md:max-w-[36rem] md:text-[4.35rem] lg:max-w-[40rem] lg:text-[4.8rem]">
              Reservar es fácil.
              <br />
              Decidir bien no siempre.
            </h1>
            <p className="mx-auto max-w-[31rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.02rem] md:max-w-[34rem] md:text-[1.1rem] md:leading-8">
              {heroSubtitle}
            </p>
          </div>
        </div>

        <form
          className="w-full rounded-[var(--app-radius-card)] border border-slate-200/80 bg-white/94 p-4 shadow-[0_28px_52px_-36px_rgba(15,23,42,0.24)] backdrop-blur-sm sm:p-5 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="flex flex-col gap-4 text-center md:gap-5">
            <div className="space-y-1.5">
              <p className="app-eyebrow text-slate-500">Buscador principal</p>
              <p className="mx-auto max-w-[36rem] text-sm leading-6 text-slate-600">
                Elegí con información real desde el primer vistazo.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="flex-1 space-y-2.5 text-left">
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
                Buscar alojamientos
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-200/80 pt-3 text-[13px] text-slate-600 sm:gap-x-6 sm:pt-4 sm:text-[13.5px]">
              {valueProofItems.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 font-medium leading-5">
                  <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ExploreHero;