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

const heroSubtitle = 'Elegí con información real antes de reservar. Mirá qué ya está comprobado antes de abrir una ficha.';
const heroBackgroundImage = 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80';
const valueProofItems = [
  'Ubicación real',
  'Anfitrión visible',
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

      <div className="relative z-10 mx-auto flex w-full max-w-[43rem] flex-col items-center gap-12 text-center md:gap-14">
        <div className="max-w-[34rem] space-y-4 md:space-y-5">
          <p className="app-eyebrow text-brand">Elegir mejor</p>
          <div className="space-y-3 md:space-y-4">
            <h1 className="font-display mx-auto max-w-[18rem] text-balance text-[2.95rem] font-semibold leading-[0.95] tracking-[-0.05em] text-slate-950 sm:max-w-[23rem] sm:text-[4.1rem] md:max-w-[28rem] md:text-[5.45rem] lg:max-w-[31rem] lg:text-[6.15rem]">
              Reservar es fácil.
              <br />
              Decidir bien no siempre.
            </h1>
            <p className="mx-auto max-w-[22rem] text-[1rem] font-semibold leading-7 text-slate-800 sm:max-w-[24rem] sm:text-[1.04rem] md:max-w-[25rem] md:text-[1.13rem] md:leading-8">
              {heroSubtitle}
            </p>
          </div>
        </div>

        <form
          className="w-full rounded-[calc(var(--app-radius-card)+4px)] border border-[color:var(--app-surface-border)] bg-white/96 p-6 shadow-[0_38px_72px_-40px_rgba(15,23,42,0.34)] ring-1 ring-white/70 backdrop-blur-md sm:p-7 md:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="flex flex-col gap-5 text-center md:gap-6">
            <div className="space-y-2">
              <p className="app-eyebrow text-slate-500">Buscador principal</p>
              <p className="mx-auto max-w-[31rem] text-sm leading-6 text-slate-700">
                Ingresá una zona y empezá por avisos que ya muestran ubicación, anfitrión y datos comprobados.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 lg:flex-row lg:items-stretch lg:gap-4">
              <div className="flex-1 text-left">
                <LocationAutocomplete
                  inputId="explore-destination"
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="¿A dónde querés ir?"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                  ariaLabel="Destino"
                  inputClassName="min-h-[4.1rem] border-[color:var(--app-surface-border-strong)] bg-white/98 py-4 pl-14 text-[1rem] text-slate-950 placeholder:text-slate-500 focus:border-brand focus:shadow-[0_0_0_4px_rgba(67,56,202,0.14),0_24px_40px_-30px_rgba(67,56,202,0.38)] md:min-h-[4.25rem] md:pl-16"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-[4.1rem] w-full px-8 text-[1rem] font-extrabold tracking-[-0.01em] shadow-[0_24px_48px_-28px_rgba(67,56,202,0.54)] transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-[1px] hover:shadow-[0_28px_54px_-28px_rgba(67,56,202,0.58)] lg:min-w-[248px] lg:w-auto lg:flex-none md:h-[4.25rem]"
              >
                Buscar alojamientos
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200/80 pt-3 text-[12px] text-slate-700/80 sm:gap-x-5 sm:pt-4 sm:text-[12.5px]">
              {valueProofItems.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 font-medium leading-5 opacity-80">
                  <Icons.CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600/70" />
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