import { Icons } from '../Icons';
import { LocationAutocomplete, type LocationSuggestion } from '../LocationAutocomplete';
import { Button } from '../ui/Button';

type ExploreHeroProps = {
  backgroundImage?: string;
  searchValue: string;
  locationSuggestions: LocationSuggestion[];
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchSubmitValue: (value: string) => void;
  onLocationSelect: (location: LocationSuggestion) => void;
};

const heroSubtitle = 'Elegí mejor antes de reservar.';
const valueProofItems = [
  'Ubicación real',
  'Anfitrión visible',
  'Datos comprobados',
] as const;

export const ExploreHero = ({
  backgroundImage,
  searchValue,
  locationSuggestions,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  return (
    <section style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="relative overflow-hidden rounded-[calc(var(--app-radius-display)+4px)] border border-white/75 bg-slate-950 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.28)]">
        {backgroundImage ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 scale-[1.03] bg-cover bg-center"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                filter: 'saturate(0.94) contrast(0.94) brightness(0.99)',
                opacity: 0.94,
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(255,255,255,0.93)_8%,rgba(251,253,255,0.78)_34%,rgba(242,246,250,0.5)_62%,rgba(232,239,245,0.26)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_42%,rgba(244,247,251,0.08)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_34%,rgba(236,242,248,0.1)_0%,rgba(236,242,248,0)_44%)]" />
          </div>
        ) : null}

        <div className="relative px-5 py-5 sm:px-7 sm:py-6 md:px-10 md:py-7 lg:px-12 lg:py-8">
          <div className="mx-auto max-w-[46rem] space-y-4 text-center md:space-y-5">
            <div className="space-y-2.5 md:space-y-3">
              <h1 className="font-display mx-auto max-w-[10.5ch] text-balance text-[3rem] font-semibold leading-[0.92] tracking-[-0.06em] text-slate-950 sm:text-[4rem] md:text-[4.9rem] lg:text-[5.5rem]">
                Reservar es fácil. Decidir bien no siempre.
              </h1>
              <p className="mx-auto max-w-[34rem] text-[1rem] font-semibold leading-6 text-slate-800 sm:text-[1.04rem] md:text-[1.08rem]">
                {heroSubtitle}
              </p>
            </div>

            <form
              className="space-y-3.5 md:space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
            >
              <div className="mx-auto flex max-w-[50rem] flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="min-w-0 flex-1">
                  <LocationAutocomplete
                    inputId="explore-destination"
                    value={searchValue}
                    suggestions={locationSuggestions}
                    onChange={onSearchChange}
                    placeholder="¿A dónde querés ir?"
                    onSelect={onLocationSelect}
                    onSubmitValue={onSearchSubmitValue}
                    ariaLabel="Destino"
                    inputClassName="min-h-[3.5rem] rounded-[20px] border-slate-200/90 bg-white/96 py-3 pl-14 text-[1rem] font-semibold text-slate-950 placeholder:text-slate-500 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.28)] focus:border-brand/30 focus:shadow-[0_0_0_4px_rgba(67,56,202,0.1)] md:min-h-[3.75rem] md:pl-16 md:text-[1.05rem]"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="min-h-[3.5rem] w-full rounded-[20px] px-8 text-[1rem] font-extrabold tracking-[-0.01em] shadow-[0_20px_40px_-28px_rgba(67,56,202,0.45)] sm:min-h-[3.75rem] sm:min-w-[232px] sm:w-auto sm:flex-none sm:px-9 sm:text-[1.04rem]"
                >
                  Buscar alojamientos
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/70 pt-4 text-[10.5px] text-slate-600 sm:gap-x-5 sm:text-[11px]">
                {valueProofItems.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 font-medium leading-5">
                    <Icons.CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600/70" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;