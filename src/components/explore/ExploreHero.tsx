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

const trustLine = 'Propiedades verificadas • reseñas reales • información clara antes de reservar';

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

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="max-w-[46rem] space-y-8 md:space-y-9">
          <div className="space-y-4 md:space-y-5">
            <h1 className="max-w-[40rem] text-balance text-[2.95rem] font-bold leading-[0.96] text-white md:text-[4.55rem]">
              Reservar es fácil.
              <br />
              Elegir bien no siempre.
            </h1>
            <p className="max-w-[42rem] text-base leading-7 text-slate-100/92 md:text-[1.1rem] md:leading-8">
              Elegí con información clara desde el inicio: ubicación, verificación y reseñas reales antes de decidir.
            </p>
          </div>
          <form
            className="max-w-[42rem] rounded-[20px] border border-white/70 bg-white/96 p-4 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.18)] md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2.5">
                <label htmlFor="explore-destination" className="block text-sm font-semibold text-slate-800">
                  Destino
                </label>
                <LocationAutocomplete
                  inputId="explore-destination"
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="¿Dónde querés alojarte?"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-14 w-full rounded-[14px] bg-slate-950 px-6 text-base font-semibold text-white shadow-none hover:translate-y-0 hover:bg-slate-900 hover:shadow-none active:scale-[0.99] md:w-auto md:min-w-[188px]"
              >
                Ver opciones
              </Button>
            </div>
          </form>

          <p className="text-sm font-medium text-slate-100/88 md:text-[15px]">
            {trustLine}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;