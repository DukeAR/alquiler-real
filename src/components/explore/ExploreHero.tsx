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
    <section className="mx-auto max-w-[68.75rem]" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="rounded-[calc(var(--app-radius-display)+4px)] border border-white/80 bg-white px-5 py-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8 md:px-10 md:py-9 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[46rem] space-y-5 text-center md:space-y-6">
          <div className="space-y-2.5 md:space-y-3">
            <h1 className="font-display mx-auto max-w-[10.5ch] text-balance text-[3rem] font-semibold leading-[0.92] tracking-[-0.06em] text-slate-950 sm:text-[4rem] md:text-[4.9rem] lg:text-[5.5rem]">
              Reservar es fácil. Decidir bien no siempre.
            </h1>
            <p className="mx-auto max-w-[34rem] text-[1rem] font-semibold leading-6 text-slate-700 sm:text-[1.04rem] md:text-[1.08rem]">
              {heroSubtitle}
            </p>
          </div>

          <form
            className="space-y-4 md:space-y-5"
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
                  inputClassName="min-h-[3.5rem] rounded-[20px] border-slate-200 bg-white py-3 pl-14 text-[1rem] font-semibold text-slate-950 placeholder:text-slate-500 shadow-none focus:border-brand/30 focus:shadow-[0_0_0_4px_rgba(67,56,202,0.1)] md:min-h-[3.75rem] md:pl-16 md:text-[1.05rem]"
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

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200/80 pt-4 text-[10.5px] text-slate-600 sm:gap-x-5 sm:text-[11px]">
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
    </section>
  );
};

export default ExploreHero;