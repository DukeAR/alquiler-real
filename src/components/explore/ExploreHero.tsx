import { motion } from 'motion/react';
import { VERIFIED_ONSITE_LABEL } from '../../lib/productTerminology';
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
  'Identidad validada',
  VERIFIED_ONSITE_LABEL,
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
    <section className="app-page-explore mt-4 sm:mt-6 md:mt-8" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="relative overflow-hidden rounded-[24px] bg-slate-100 shadow-[0_24px_72px_rgba(15,23,42,0.14)] md:rounded-[40px] md:min-h-[600px] xl:min-h-[640px]">
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

        <div className="relative z-10 flex flex-col items-center justify-center px-4 py-10 text-center sm:px-5 sm:py-12 md:min-h-[600px] md:px-8 md:py-16 xl:min-h-[640px] xl:px-10">
          <div className="flex w-full max-w-[980px] flex-col items-center text-center">
            <motion.div
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-600 sm:mb-5 sm:text-xs sm:tracking-[0.34em]"
              {...getRevealMotionProps(0.04)}
            >
              {heroGeoEyebrow}
            </motion.div>

            <motion.h1
              className="font-display max-w-[920px] text-balance !text-[34px] font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 sm:!text-[38px] md:!text-[58px] md:leading-[1] lg:!text-[68px] lg:leading-[0.96]"
              {...getRevealMotionProps(0.1)}
            >
              <span className="block">La información real importa.</span>
              <span className="block">Elegí mejor antes de reservar.</span>
            </motion.h1>

            <motion.p
              className="mt-5 max-w-[740px] text-balance !text-[16px] font-medium leading-7 text-slate-700 sm:mt-6 sm:!text-[17px] md:!text-[21px] lg:!text-[24px]"
              {...getRevealMotionProps(0.16)}
            >
              {heroSubtitle}
            </motion.p>

            <motion.form
              className="mt-8 w-full max-w-[980px] sm:mt-10 md:mt-12"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
              {...getRevealMotionProps(0.22)}
            >
              <div
                className="relative flex flex-col rounded-[24px] border border-white/70 bg-white/95 p-2.5 shadow-[0_20px_56px_rgba(15,23,42,0.16)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_28px_90px_rgba(15,23,42,0.22)] focus-within:ring-4 focus-within:ring-indigo-500/20 md:h-[80px] md:rounded-full md:p-0 md:px-5"
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
                  inputClassName="!h-11 !min-h-11 rounded-full !border-0 bg-transparent px-4 pl-12 pr-4 !text-[0.98rem] font-medium tracking-[-0.01em] text-slate-800 !shadow-none outline-none placeholder:text-slate-400 transition-all duration-200 hover:!border-transparent hover:!shadow-none focus:!border-transparent focus:!shadow-none focus:outline-none focus-visible:!border-transparent focus-visible:!shadow-none md:!h-[80px] md:!min-h-[80px] md:rounded-full md:pr-[16rem] md:!text-[1.1rem]"
                />

                <div className="mt-2.5 md:absolute md:right-2 md:top-1/2 md:mt-0 md:-translate-y-1/2">
                  <button
                    type="submit"
                    className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 text-[0.98rem] font-semibold text-white shadow-[0_14px_35px_rgba(79,70,229,0.35)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-indigo-700 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 md:h-[60px] md:w-auto md:px-10 md:text-[1.04rem]"
                  >
                    Buscar alojamientos
                    <Icons.ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.form>

            <motion.div
              className="mt-6 flex flex-wrap justify-center gap-2.5 sm:mt-8 sm:gap-3.5"
              {...getRevealMotionProps(0.3)}
            >
              {valueProofItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/78 px-3 py-1.75 text-[0.76rem] font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/88 sm:px-4 sm:py-2 sm:text-[0.88rem]"
                >
                  <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
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