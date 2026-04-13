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
    <section className="space-y-5 md:space-y-6" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="max-w-[46rem] space-y-2.5 md:space-y-3">
        <h1 className="font-display max-w-[11ch] text-balance text-[3.05rem] font-semibold leading-[0.92] tracking-[-0.06em] text-slate-950 sm:text-[4.1rem] md:text-[5.1rem] lg:text-[5.9rem]">
          Reservar es fácil. Decidir bien no siempre.
        </h1>
        <p className="max-w-[36rem] text-[1rem] font-semibold leading-6 text-slate-800 sm:text-[1.04rem] md:text-[1.08rem]">
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
        <div className="flex max-w-[58rem] flex-col gap-3.5 md:flex-row md:items-stretch">
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
              inputClassName="min-h-[4.45rem] rounded-[22px] border-slate-200/80 bg-white/92 py-4 pl-14 text-[1.05rem] font-semibold text-slate-950 placeholder:text-slate-500 shadow-none focus:border-slate-950/15 focus:shadow-[0_0_0_4px_rgba(15,23,42,0.08)] md:min-h-[4.75rem] md:pl-16 md:text-[1.1rem]"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-[4.45rem] w-full rounded-[22px] px-8 text-[1.02rem] font-extrabold tracking-[-0.01em] shadow-none md:h-[4.75rem] md:min-w-[248px] md:w-auto md:flex-none md:px-10 md:text-[1.08rem]"
          >
            Buscar alojamientos
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-slate-700 sm:gap-x-5 sm:text-[11px]">
          {valueProofItems.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 font-medium leading-5">
              <Icons.CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600/75" />
              <span>{item}</span>
            </span>
          ))}
        </div>
      </form>
    </section>
  );
};

export default ExploreHero;