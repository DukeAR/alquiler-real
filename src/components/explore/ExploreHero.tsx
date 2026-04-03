import { motion } from 'motion/react';
import { LocationAutocomplete, type LocationSuggestion } from '../LocationAutocomplete';
import { Icons } from '../Icons';
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
    <section className="relative overflow-hidden rounded-[40px] bg-slate-950 px-6 py-12 shadow-[0_36px_90px_-48px_rgba(15,23,42,0.42)] md:px-10 md:py-16 lg:px-14 lg:py-20">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80"
          alt="Costa Atlántica argentina"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(108deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.84)_36%,rgba(15,23,42,0.62)_68%,rgba(15,23,42,0.42)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.2),transparent_32%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-8 md:space-y-10"
        >
          <div className="space-y-4 md:space-y-5">
            <h1 className="font-display max-w-3xl text-balance text-[3rem] font-semibold leading-[0.93] tracking-[-0.06em] text-white md:text-[4.9rem]">
              Reservar es fácil.
              <br />
              Decidir bien no siempre.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-200 md:text-xl md:leading-8">
              Elegí con información real antes de reservar.
            </p>
          </div>
          <form
            className="max-w-3xl rounded-[30px] border border-white/14 bg-white/12 p-4 shadow-[0_30px_70px_-44px_rgba(15,23,42,0.44)] backdrop-blur-md md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <LocationAutocomplete
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="¿A dónde querés ir?"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                />
              </div>

              <Button type="submit" size="lg" className="h-14 w-full rounded-[20px] px-6 text-base md:w-auto md:min-w-[210px]">
                <Icons.ArrowRight className="h-5 w-5" />
                Elegir mejor
              </Button>
            </div>

            <p className="mt-3 pl-1 text-sm text-slate-200/88 md:text-[15px]">
              Información real para decidir con confianza.
            </p>
          </form>

          <p className="text-sm font-medium tracking-[0.01em] text-slate-200/78 md:text-[15px]">
            {trustLine}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ExploreHero;