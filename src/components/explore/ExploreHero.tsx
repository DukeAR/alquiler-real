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

const trustLine = 'Comparás rápido quién publica, dónde está el lugar y qué ya se pudo confirmar.';

export const ExploreHero = ({
  searchValue,
  locationSuggestions,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-slate-950 px-6 py-14 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.26)] md:px-10 md:py-18 lg:px-14 lg:py-20">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center opacity-65"
        />
        <div className="absolute inset-0 bg-slate-950/52" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="space-y-10 md:space-y-12 lg:space-y-14">
          <div className="space-y-4 md:space-y-5">
            <h1 className="font-display max-w-[41rem] text-balance text-[2.78rem] font-semibold leading-[1.02] tracking-[-0.035em] text-white md:text-[4.15rem] lg:text-[4.45rem]">
              Elegir dónde quedarte debería ser simple.
            </h1>
            <p className="max-w-[43rem] text-[0.98rem] leading-7 text-slate-100 md:text-[1.08rem] md:leading-8">
              No podemos elegir por vos, pero te damos claridad en todo el proceso para que decidas tranquilo.
            </p>
          </div>
          <form
            className="w-full max-w-[58rem] rounded-[24px] border border-white/75 bg-white/97 p-5 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.26)] backdrop-blur-sm md:p-6 lg:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
              <div className="flex-1 space-y-3">
                <label htmlFor="explore-destination" className="app-form-label block text-slate-500">
                  Zona o ciudad
                </label>
                <LocationAutocomplete
                  inputId="explore-destination"
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="Buscá una zona, ciudad o barrio"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-16 w-full rounded-[16px] bg-slate-950 px-6 text-[0.98rem] font-semibold tracking-[-0.01em] text-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.42)] hover:-translate-y-[1px] hover:bg-slate-900 hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.48)] active:translate-y-0 active:scale-[0.995] lg:w-auto lg:min-w-[208px] lg:flex-none"
              >
                Ver alojamientos
              </Button>
            </div>
          </form>

          <p className="max-w-[48rem] text-[13px] font-semibold leading-6 tracking-[0.01em] text-slate-100 md:text-[14px]">
            {trustLine}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;