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
    <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-10 shadow-[0_22px_56px_-38px_rgba(15,23,42,0.34)] md:px-10 md:py-14 lg:px-14 lg:py-16">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(108deg,rgba(2,6,23,0.92)_0%,rgba(15,23,42,0.82)_44%,rgba(30,41,59,0.62)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl space-y-7 md:space-y-8"
        >
          <div className="space-y-4 md:space-y-5">
            <h1 className="max-w-[40rem] text-balance text-[2.9rem] font-extrabold leading-[0.94] tracking-[-0.03em] text-white md:text-[4.6rem]">
              Reservar es fácil.
              <br />
              Elegir bien no siempre.
            </h1>
            <p className="max-w-[34rem] text-[1.02rem] font-medium leading-7 text-slate-100 md:text-[1.15rem] md:leading-8">
              Tomá decisiones con información clara desde el inicio.
            </p>
          </div>
          <form
            className="max-w-3xl rounded-[22px] border border-slate-200/70 bg-white/98 p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.18)] md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="grid gap-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-4">
              <div className="space-y-2.5">
                <label htmlFor="explore-destination" className="block text-[0.95rem] font-semibold text-slate-800">
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
                className="h-14 w-full rounded-[16px] bg-slate-950 px-6 text-base font-semibold text-white shadow-none hover:translate-y-0 hover:bg-slate-900 hover:shadow-none active:scale-[0.99] md:min-w-[180px]"
              >
                Ver opciones
              </Button>
            </div>
          </form>

          <p className="text-sm font-semibold tracking-[0.01em] text-slate-100/92 md:text-[15px]">
            {trustLine}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ExploreHero;