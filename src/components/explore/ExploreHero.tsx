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
const compactTrustLine = 'Revisá qué ya fue comprobado antes de reservar.';

export const ExploreHero = ({
  searchValue,
  locationSuggestions,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  return (
    <section className="w-full py-16 md:py-24 bg-[var(--color-primary-soft)]" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center opacity-65"
        />
        <div className="absolute inset-0 bg-slate-950/52" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="space-y-7 sm:space-y-10 md:space-y-12 lg:space-y-14">
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <h1 className="font-display max-w-[19rem] text-balance text-[2.12rem] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:max-w-[30rem] sm:text-[2.78rem] md:max-w-[41rem] md:text-[4.15rem] lg:text-[4.45rem]">
              Reservar es fácil.
              <br />
              Decidir bien no siempre.
            </h1>
            <p className="max-w-[32rem] text-[0.94rem] leading-6 text-slate-100 sm:text-[0.98rem] sm:leading-7 md:max-w-[43rem] md:text-[1.08rem] md:leading-8">
              Por eso mostramos ubicación, quién publica y qué parte del aviso ya está comprobada antes de que mandes un mensaje o pagues. La idea es que sepas con quién tratás y qué ya quedó claro desde el inicio.
            </p>
          </div>
          <form
            className="w-full max-w-[58rem] rounded-[22px] border border-white/75 bg-white/97 p-4 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.26)] backdrop-blur-sm sm:p-5 md:rounded-[24px] md:p-6 lg:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:gap-5">
              <div className="flex-1 space-y-2.5 sm:space-y-3">
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
                className="h-14 w-full rounded-[16px] bg-slate-950 px-5 text-[0.96rem] font-semibold tracking-[-0.01em] text-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.42)] hover:-translate-y-[1px] hover:bg-slate-900 hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.48)] active:translate-y-0 active:scale-[0.995] sm:h-16 sm:px-6 sm:text-[0.98rem] lg:w-auto lg:min-w-[208px] lg:flex-none"
              >
                Ver alojamientos
              </Button>
            </div>
          </form>

          <p className="max-w-[48rem] text-[12.5px] font-semibold leading-5 tracking-[0.01em] text-slate-100 md:text-[14px] md:leading-6">
            <span className="sm:hidden">{compactTrustLine}</span>
            <span className="hidden sm:inline">{trustLine}</span>
          </p>
        </div>
      </div>
    </section>
    </section>
  );
  );
};

export default ExploreHero;