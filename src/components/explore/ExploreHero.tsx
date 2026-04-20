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

const heroSubtitle = 'Compará precio, zona y verificación antes de reservar.';
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
      <div className="relative overflow-hidden rounded-[calc(var(--app-radius-display)+4px)] bg-slate-950 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {backgroundImage ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 scale-[1.03] bg-cover bg-center"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                filter: 'saturate(0.9) contrast(0.95) brightness(0.95)',
                opacity: 1,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.35))',
                backdropFilter: 'blur(2px)',
              }}
            />
          </div>
        ) : null}

        <div className="relative px-5 py-5 sm:px-7 sm:py-6 md:px-10 md:py-7 lg:px-12 lg:py-8">
          <div className="mx-auto flex max-w-[49rem] flex-col items-center text-center">
            <div className="flex max-w-[45rem] flex-col items-center text-center gap-2 md:gap-2.5">
              <h1 className="font-display mx-auto max-w-[10.5ch] text-balance text-[3rem] font-semibold leading-[1.1] tracking-[-0.06em] text-[#0f172a] sm:text-[4rem] md:text-[4.9rem] lg:text-[5.5rem]">
                Reservar es fácil. Decidir bien no siempre.
              </h1>
              <p className="mx-auto max-w-[31rem] text-[0.98rem] font-medium leading-6 text-[#334155] sm:text-[1.02rem] md:text-[1.05rem]">
                {heroSubtitle}
              </p>
            </div>

            <form
              className="mt-6 flex w-full flex-col items-center gap-3 md:gap-3.5"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
            >
              <div className="flex w-full max-w-[49rem] flex-col items-center gap-2.5 sm:flex-row sm:items-center sm:justify-center">
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
                    inputClassName="min-h-[3.5rem] rounded-[20px] border-[rgba(15,23,42,0.06)] bg-white/92 py-3 pl-14 text-[1rem] font-semibold text-slate-950 placeholder:text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.10)] focus:border-brand/30 focus:bg-white focus:shadow-[0_0_0_4px_rgba(67,56,202,0.1)] md:min-h-[3.75rem] md:pl-16 md:text-[1.05rem]"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="min-h-[3.5rem] w-full rounded-[20px] px-8 text-[1rem] font-extrabold tracking-[-0.01em] shadow-[0_24px_44px_-28px_rgba(67,56,202,0.52)] sm:min-h-[3.75rem] sm:min-w-[244px] sm:w-auto sm:flex-none sm:px-10 sm:text-[1.04rem]"
                >
                  Buscar alojamientos
                  <Icons.ArrowRight className="hidden h-4 w-4 sm:block" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 pt-1 text-[0.78rem] text-[#334155] sm:gap-x-3 sm:text-[0.84rem]">
                {valueProofItems.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.9)] px-2.5 py-1.25 font-semibold leading-none text-[#334155] shadow-[0_12px_24px_-24px_rgba(15,23,42,0.24)] backdrop-blur-[2px]">
                    <Icons.CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
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