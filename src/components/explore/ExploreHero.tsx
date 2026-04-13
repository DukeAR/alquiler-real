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

const heroSubtitle = 'Elegí mejor antes de reservar.';
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
      className="relative mx-auto max-w-[48rem] overflow-hidden rounded-[var(--app-radius-display)] border border-slate-200/80 px-5 py-8 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.2)] sm:px-6 sm:py-10 md:px-8 md:py-11 lg:px-9 lg:py-12"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-[-2%] scale-[1.03]"
          style={{
            backgroundImage: `url(${heroBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(1.5px) saturate(0.96) contrast(1.04)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(248,250,252,0.14)_42%,rgba(255,255,255,0.26)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(165,180,252,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[48rem] flex-col items-center gap-7 text-center md:gap-8">
        <div className="max-w-[42rem] space-y-3 md:space-y-4">
          <div className="space-y-2.5 md:space-y-3">
            <h1 className="font-display mx-auto max-w-[13ch] text-balance text-[3.45rem] font-semibold leading-[0.92] tracking-[-0.06em] text-slate-950 sm:text-[4.7rem] md:text-[5.95rem] lg:text-[6.8rem]">
              Reservar es fácil. Decidir bien no siempre.
            </h1>
            <p className="mx-auto max-w-[30rem] text-[1rem] font-semibold leading-6 text-slate-950 sm:max-w-none sm:text-[1.05rem] md:text-[1.1rem]">
              {heroSubtitle}
            </p>
          </div>
        </div>

        <form
          className="w-full rounded-[calc(var(--app-radius-card)+6px)] border border-slate-200/90 bg-white p-5 shadow-[0_24px_56px_-40px_rgba(15,23,42,0.24)] sm:p-6 md:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="flex flex-col gap-5 text-center md:gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4">
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
                  inputClassName="min-h-[4.6rem] border-[color:var(--app-surface-border-strong)] bg-white py-4 pl-14 text-[1.06rem] font-semibold text-slate-950 placeholder:text-slate-500 focus:border-brand focus:shadow-[0_0_0_4px_rgba(67,56,202,0.14),0_24px_40px_-30px_rgba(67,56,202,0.38)] md:min-h-[4.9rem] md:pl-16 md:text-[1.12rem]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-[4.6rem] w-full px-9 text-[1.02rem] font-extrabold tracking-[-0.01em] shadow-[0_26px_54px_-28px_rgba(67,56,202,0.58)] transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-[1px] hover:shadow-[0_30px_60px_-28px_rgba(67,56,202,0.62)] lg:min-w-[268px] lg:w-auto lg:flex-none md:h-[4.9rem] md:text-[1.08rem]"
              >
                Buscar alojamientos
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200/80 pt-4 text-[10.5px] text-slate-600/85 sm:gap-x-5 sm:text-[11px]">
              {valueProofItems.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 font-medium leading-5 opacity-75">
                  <Icons.CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600/70" />
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