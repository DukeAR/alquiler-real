import { motion } from 'motion/react';
import { Icons } from '../Icons';
import { LocationAutocomplete, type LocationSuggestion } from '../LocationAutocomplete';

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

const getRevealMotionProps = (delay: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.62,
    delay,
    ease: [0.22, 1, 0.36, 1] as const,
  },
});

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
    <section className="mx-auto mt-8 w-full max-w-[1440px] px-6" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="relative overflow-hidden rounded-[28px] bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.16)] md:rounded-[40px] lg:min-h-[620px]">
        {backgroundImage ? (
          <div className="pointer-events-none absolute inset-0">
            <img
              src={backgroundImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
            />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/88 via-white/55 to-white/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/20" />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-14 text-center md:min-h-[620px] md:px-8 md:py-16">
          <div className="flex w-full max-w-4xl flex-col items-center text-center">
            <motion.div
              className="mb-5 text-xs font-semibold uppercase tracking-[0.34em] text-slate-600"
              {...getRevealMotionProps(0.04)}
            >
              {heroGeoEyebrow}
            </motion.div>

            <motion.h1
              className="font-display max-w-[780px] text-balance text-[36px] font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 md:text-[46px] md:leading-[1.02] lg:text-[56px] lg:leading-[0.98]"
              {...getRevealMotionProps(0.1)}
            >
              <span className="block">La información real importa.</span>
              <span className="block">Elegí mejor antes de reservar.</span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-[620px] text-balance text-base font-medium leading-relaxed text-slate-700 md:text-lg lg:text-xl"
              {...getRevealMotionProps(0.16)}
            >
              {heroSubtitle}
            </motion.p>

            <motion.form
              className="mt-12 w-full max-w-[860px]"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
              {...getRevealMotionProps(0.22)}
            >
              <div
                className="relative flex flex-col rounded-[28px] border border-white/70 bg-white/95 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_28px_90px_rgba(15,23,42,0.22)] focus-within:ring-4 focus-within:ring-indigo-500/20 md:h-[72px] md:rounded-full md:p-0 md:px-4"
                data-testid="hero-search-shell"
              >
                <LocationAutocomplete
                  inputId="explore-destination"
                  value={searchValue}
                  suggestions={locationSuggestions}
                  onChange={onSearchChange}
                  placeholder="¿A dónde querés ir?"
                  onSelect={onLocationSelect}
                  onSubmitValue={onSearchSubmitValue}
                  ariaLabel="Destino"
                  icon={<Icons.MapPin className="h-6 w-6 text-slate-500" />}
                  hideClearButton
                  inputClassName="!h-12 !min-h-12 rounded-full !border-0 bg-transparent px-4 pl-12 pr-4 text-lg font-medium tracking-[-0.01em] text-slate-800 !shadow-none outline-none placeholder:text-slate-400 transition-all duration-200 hover:!border-transparent hover:!shadow-none focus:!border-transparent focus:!shadow-none focus:outline-none focus-visible:!border-transparent focus-visible:!shadow-none md:!h-[72px] md:!min-h-[72px] md:rounded-full md:pr-[15rem]"
                />

                <div className="mt-3 md:absolute md:right-2 md:top-1/2 md:mt-0 md:-translate-y-1/2">
                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 text-base font-semibold text-white shadow-[0_14px_35px_rgba(79,70,229,0.35)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-indigo-700 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 md:h-[56px] md:w-auto md:px-8"
                  >
                    Buscar alojamientos
                    <Icons.ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.form>

            <motion.div
              className="mt-7 flex flex-wrap justify-center gap-3"
              {...getRevealMotionProps(0.3)}
            >
              {valueProofItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreHero;