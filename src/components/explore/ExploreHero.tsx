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
const heroGeoEyebrow = 'COSTA ATLÁNTICA ARGENTINA';
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
      <div className="relative overflow-hidden rounded-[calc(var(--app-radius-display)+4px)] bg-[#eef3f4] shadow-[0_14px_30px_-28px_rgba(15,23,42,0.12)]">
        {backgroundImage ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 scale-[1.005] bg-cover bg-center"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                filter: 'blur(0.2px) brightness(1.01) contrast(1.06) saturate(0.99)',
                opacity: 1,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(248,250,252,0.34) 0%, rgba(247,250,252,0.16) 42%, rgba(243,246,248,0.05) 100%)',
              }}
            />
          </div>
        ) : null}

        <div className="relative px-4 pt-9 pb-5 sm:px-6 sm:pt-10 sm:pb-6 md:px-8 md:pt-11 md:pb-7 lg:px-10 lg:pt-12 lg:pb-8">
          <div className="mx-auto flex max-w-[47.5rem] flex-col items-center text-center">
            <div className="flex max-w-[760px] flex-col items-center gap-2.5 text-center sm:gap-3">
              <div className="mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.28em] text-[#475569] sm:text-[0.82rem]">
                {heroGeoEyebrow}
              </div>
              <h1 className="font-display mx-auto max-w-[760px] text-balance text-[clamp(1.6rem,5.8vw,4.75rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-slate-950">
                <span className="block">Donde la información importa.</span>
                <span className="block">Elegí mejor antes de reservar.</span>
              </h1>
              <p className="mx-auto mt-0.5 mb-6 max-w-[40rem] rounded-[14px] bg-white/24 px-3 py-1.5 text-balance text-[0.72rem] font-medium leading-[1.45] tracking-[-0.01em] text-[#1e293b] backdrop-blur-[3px] sm:mb-7 sm:px-4 sm:text-[0.85rem]">
                {heroSubtitle}
              </p>
            </div>

            <form
              className="mt-6 mb-4 flex w-full max-w-[760px] flex-col items-center sm:mt-7 sm:mb-5"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
            >
              <div className="grid w-full grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] gap-2.5">
                <div className="min-w-0">
                  <LocationAutocomplete
                    inputId="explore-destination"
                    value={searchValue}
                    suggestions={locationSuggestions}
                    onChange={onSearchChange}
                    placeholder="¿A dónde querés ir?"
                    onSelect={onLocationSelect}
                    onSubmitValue={onSearchSubmitValue}
                    ariaLabel="Destino"
                    inputClassName="!h-[60px] !min-h-[60px] rounded-[20px] border-[rgba(15,23,42,0.06)] bg-white/92 py-2.5 pl-14 text-[0.92rem] font-semibold text-slate-950 placeholder:text-slate-500 shadow-[0_8px_22px_-22px_rgba(15,23,42,0.18)] focus:border-brand/30 focus:bg-white focus:shadow-[0_0_0_4px_rgba(67,56,202,0.1)] sm:text-[0.95rem] md:pl-16 md:text-[1rem]"
                  />
                </div>

                <Button
                  type="submit"
                  size="auto"
                  className="!h-[60px] !min-h-[60px] w-full rounded-[20px] px-3 text-[0.84rem] font-extrabold leading-none tracking-[-0.02em] shadow-[0_18px_36px_-28px_rgba(67,56,202,0.4)] sm:px-4 sm:text-[0.95rem] md:px-5 md:text-[0.98rem]"
                >
                  Buscar alojamientos
                  <Icons.ArrowRight className="hidden h-4 w-4 sm:block" />
                </Button>
              </div>
            </form>

            <div className="mt-4 flex w-full max-w-[760px] flex-nowrap items-center justify-center gap-2 overflow-x-auto pt-0.5 text-[0.66rem] text-slate-600/90 sm:gap-2.5 sm:text-[0.7rem]">
              {valueProofItems.map((item) => (
                <span key={item} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/54 px-2.5 py-[0.35rem] font-medium leading-none text-slate-600/90 shadow-[0_6px_16px_-18px_rgba(15,23,42,0.12)] backdrop-blur-[1px]">
                  <Icons.CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600/75" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;