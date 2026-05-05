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
  'Identidad validada',
  'Verificación presencial',
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
    <section className="app-page-explore mt-8" style={{ fontFamily: 'var(--font-ui)' }}>
      <div className="relative overflow-hidden rounded-[28px] bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.16)] md:rounded-[40px] md:min-h-[600px] xl:min-h-[640px]">
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

        <div className="relative z-10 flex flex-col items-center justify-center px-5 py-14 text-center md:min-h-[600px] md:px-8 md:py-16 xl:min-h-[640px] xl:px-10">
          <div className="flex w-full max-w-[980px] flex-col items-center text-center">
            <motion.div
              className="mb-5 text-xs font-semibold uppercase tracking-[0.34em] text-slate-600"
              {...getRevealMotionProps(0.04)}
            >
              {heroGeoEyebrow}
            </motion.div>

            <motion.h1
              className="font-display max-w-[920px] text-balance !text-[42px] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 md:!text-[58px] md:leading-[1] lg:!text-[68px] lg:leading-[0.96]"
              {...getRevealMotionProps(0.1)}
            >
              <span className="block">La información real importa.</span>
              <span className="block">Elegí mejor antes de reservar.</span>
            </motion.h1>

            <motion.p
              className="mt-7 max-w-[740px] text-balance !text-[18px] font-medium leading-relaxed text-slate-700 md:!text-[21px] lg:!text-[24px]"
              {...getRevealMotionProps(0.16)}
            >
              {heroSubtitle}
            </motion.p>

            <motion.form
              className="mt-12 w-full max-w-[980px]"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
              {...getRevealMotionProps(0.22)}
            >
              <div
                className="relative flex flex-col rounded-[28px] border border-white/70 bg-white/95 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_28px_90px_rgba(15,23,42,0.22)] focus-within:ring-4 focus-within:ring-indigo-500/20 md:h-[80px] md:rounded-full md:p-0 md:px-5"
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
                  inputClassName="!h-12 !min-h-12 rounded-full !border-0 bg-transparent px-4 pl-12 pr-4 !text-[1.05rem] font-medium tracking-[-0.01em] text-slate-800 !shadow-none outline-none placeholder:text-slate-400 transition-all duration-200 hover:!border-transparent hover:!shadow-none focus:!border-transparent focus:!shadow-none focus:outline-none focus-visible:!border-transparent focus-visible:!shadow-none md:!h-[80px] md:!min-h-[80px] md:rounded-full md:pr-[16rem] md:!text-[1.1rem]"
                />

                <div className="mt-3 md:absolute md:right-2 md:top-1/2 md:mt-0 md:-translate-y-1/2">
                  <button
                    type="submit"
                    className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 text-base font-semibold text-white shadow-[0_14px_35px_rgba(79,70,229,0.35)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-indigo-700 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 md:h-[60px] md:w-auto md:px-10 md:text-[1.04rem]"
                  >
                    Buscar alojamientos
                    <Icons.ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.form>

            <motion.div
              className="mt-8 flex flex-wrap justify-center gap-3.5"
              {...getRevealMotionProps(0.3)}
            >
              {valueProofItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4.5 py-2.5 text-[0.95rem] font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
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