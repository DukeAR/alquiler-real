import { motion } from 'motion/react';
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

const trustLine = 'Propiedades verificadas • reseñas reales • datos claros';

export const ExploreHero = ({
  searchValue,
  locationSuggestions,
  onSearchChange,
  onSearchSubmit,
  onSearchSubmitValue,
  onLocationSelect,
}: ExploreHeroProps) => {
  return (
    <section className="relative overflow-hidden rounded-[36px] bg-slate-950 px-6 py-12 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.36)] md:px-10 md:py-16 lg:px-14 lg:py-18">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(108deg,rgba(2,6,23,0.9)_0%,rgba(15,23,42,0.78)_42%,rgba(30,41,59,0.58)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl space-y-8 md:space-y-10"
        >
          <div className="space-y-4 md:space-y-5">
            <h1 className="font-display max-w-3xl text-balance text-[3rem] font-bold leading-[0.95] tracking-[-0.035em] text-white md:text-[4.85rem]">
              Reservar es fácil.
              <br />
              Elegir bien no siempre.
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-7 text-slate-100 md:text-xl md:leading-8">
              Tomá decisiones con información clara desde el inicio.
            </p>
          </div>
          <form
            className="max-w-3xl rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_24px_54px_-36px_rgba(15,23,42,0.28)] md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-4">
              <div className="space-y-2.5">
                <label htmlFor="explore-destination" className="block text-sm font-semibold text-slate-800">
                  Destino
                </label>
                <LocationAutocomplete
                  inputId="explore-destination"
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="Ej: Pinamar, Cariló, San Clemente"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-14 w-full rounded-[18px] px-6 text-base font-semibold shadow-none hover:translate-y-0 hover:shadow-none active:scale-100 md:min-w-[188px]"
              >
                Ver opciones
              </Button>
            </div>
          </form>

          <p className="text-sm font-semibold tracking-[0.01em] text-slate-100/88 md:text-[15px]">
            {trustLine}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ExploreHero;