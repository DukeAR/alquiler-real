import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { PageHeader } from './ui/PageHeader';

interface OnsiteVerificationPageProps {
  onBack: () => void;
}

const trustOutcomePoints = [
  'La propiedad existe',
  'Hay una persona identificada detrás',
  'Menor riesgo de fraude',
  'Mayor confianza para decidir',
];

const heroBenefitPoints = [
  'Propiedad real',
  'Anfitrión identificado',
  'Menor riesgo',
];

const nonValidationItems = [
  'Estado del inmueble',
  'Calidad de los servicios',
  'Condiciones técnicas del lugar',
];

const validationItems = [
  'Identidad del anfitrión (DNI)',
  'Acceso real a la propiedad',
  'Relación con la propiedad (servicios o documentación)',
  'Coincidencia básica con la ubicación publicada',
];

const verifierVisitChecks = [
  'Validación de identidad (DNI)',
  'Confirmación de acceso a la propiedad',
  'Verificación de vínculo con el lugar',
  'Coincidencia con la ubicación publicada',
];

const verifierIdentityPoints = [
  'Se identifica antes de la visita',
  'Coordina previamente',
  'No solicita pagos ni datos sensibles',
];

const flowSteps = [
  {
    id: 'publish',
    label: 'Publicás tu propiedad',
    title: 'Publicás tu propiedad',
    description: 'Cargás la información básica del aviso para que sea visible.',
  },
  {
    id: 'schedule',
    label: 'Coordinamos la visita',
    title: 'Coordinamos la visita',
    description: 'Elegís día y horario para la verificación.',
  },
  {
    id: 'verify',
    label: 'Validamos identidad y acceso',
    title: 'Validamos identidad y acceso',
    description: 'Confirmamos quién sos y tu vínculo con el lugar.',
  },
  {
    id: 'seal',
    label: 'Recibís el sello',
    title: 'Recibís el sello',
    description: 'La publicación se muestra como verificada.',
  },
];

export const OnsiteVerificationPage: React.FC<OnsiteVerificationPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const howItWorksRef = React.useRef<HTMLElement | null>(null);
  const onsiteVerificationTarget = '/verification?mode=onsite&returnTo=/host-dashboard';
  const [activeFlowStep, setActiveFlowStep] = React.useState(flowSteps[0].id);

  const navigateWithAuthTarget = (target: string) => {
    if (user) {
      navigate(target);
      return;
    }

    navigate('/login', { state: { from: target } });
  };

  const openOnsiteVerification = () => {
    navigateWithAuthTarget(onsiteVerificationTarget);
  };

  const scrollToSection = (element: HTMLElement | null) => {
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950"
    >
      <PageHeader
        onBack={onBack}
        heading="Verificación presencial"
        centerHeading
        className="relative mx-auto mb-1 max-w-4xl items-center gap-2 px-6 pt-4 pb-2 md:pt-5 md:pb-2"
        contentClassName="translate-y-3 md:translate-y-4"
      />

      <main className="mx-auto flex max-w-5xl flex-col gap-9 px-6 py-7 md:gap-10 md:py-9">
        <section className="relative overflow-hidden rounded-[36px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.995),rgba(248,250,252,0.97))] px-6 py-8 shadow-[0_34px_70px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),rgba(15,23,42,0.9)] md:px-10 md:py-10">
          <div aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.5),transparent)] md:inset-x-10" />

          <div className="grid gap-8 md:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)] md:items-start md:gap-10">
            <div className="space-y-5 md:self-center md:space-y-6">
              <h1 className="max-w-[11ch] text-[clamp(2.35rem,5vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 dark:text-slate-50">
                Más confianza. Mejores reservas.
              </h1>

              <p className="max-w-2xl text-[1rem] leading-7 text-slate-700 dark:text-slate-300 md:text-[1.05rem]">
                Verificamos en persona identidad y vínculo con la propiedad.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={openOnsiteVerification}>
                    <Icons.Verified className="h-5 w-5" />
                    Quiero verificar mi propiedad
                  </Button>
                  <Button variant="secondary" onClick={() => scrollToSection(howItWorksRef.current)}>
                    Ver cómo funciona
                  </Button>
                </div>
                <p className="text-[0.94rem] leading-6 text-slate-500 dark:text-slate-400">
                  Se coordina una visita, no lleva más de unos minutos.
                </p>
              </div>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div className="rounded-[28px] border border-emerald-100/80 bg-white/88 p-5 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.38)] backdrop-blur-sm dark:border-emerald-500/10 dark:bg-white/5">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.26em] text-emerald-700 dark:text-emerald-300">
                  Lo que transmite
                </p>

                <ul className="mt-4 grid gap-3 text-[0.95rem] font-medium leading-6 text-slate-700 dark:text-slate-200">
                  {heroBenefitPoints.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="rounded-[24px] border border-slate-950/10 bg-slate-950/[0.045] px-5 py-4 text-[1rem] font-semibold leading-7 text-black shadow-[0_16px_36px_-30px_rgba(15,23,42,0.45)] dark:border-slate-50/10 dark:bg-white/10 dark:text-white">
                Las propiedades verificadas se destacan automáticamente en los resultados.
              </p>
            </div>
          </div>
        </section>

        <section className="relative space-y-6 overflow-hidden rounded-[30px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] px-6 py-6 shadow-[0_28px_60px_-46px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),rgba(15,23,42,0.88)] md:px-8 md:py-8">
          <div aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.42),transparent)] md:inset-x-8" />

          <div className="space-y-2">
            <h2 className="text-[1.62rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Qué cambia cuando verificás
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:items-start md:gap-7">
            <div className="space-y-4">
              <h3 className="text-[0.98rem] font-semibold text-slate-900 dark:text-slate-100">Respaldo real</h3>
              <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-700 dark:text-slate-300">
                {trustOutcomePoints.slice(0, 2).map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div aria-hidden="true" className="hidden h-full bg-slate-300/80 dark:bg-slate-700/80 md:block" />

            <div className="space-y-4 md:pl-1">
              <h3 className="text-[0.98rem] font-semibold text-slate-900 dark:text-slate-100">Impacto en la decisión</h3>
              <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-700 dark:text-slate-300">
                {trustOutcomePoints.slice(2).map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mx-auto max-w-3xl text-center text-[0.98rem] font-semibold leading-7 text-slate-900 dark:text-slate-100">
            Esto impacta directamente en cómo te contactan y qué tipo de consultas recibís.
          </p>
        </section>

        <section>
          <div className="relative overflow-hidden rounded-[30px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] px-6 py-6 shadow-[0_28px_60px_-44px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_30%),rgba(15,23,42,0.88)] md:px-8 md:py-8">
            <div aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.42),transparent)] md:inset-x-8" />

            <div className="space-y-2">
              <h2 className="text-[1.62rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                Qué revisa esta verificación
              </h2>
            </div>

            <div className="mt-7 space-y-5 md:space-y-6">
              <div className="grid gap-5 rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700/80 dark:bg-white/5 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:gap-0 md:p-0">
                <div className="space-y-3 md:p-6">
                  <h3 className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">Qué validamos</h3>
                  <ul className="space-y-3 text-[0.96rem] font-medium leading-7 text-slate-800 dark:text-slate-200">
                    {validationItems.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div aria-hidden="true" className="hidden h-full bg-slate-200/85 dark:bg-slate-700/70 md:block" />

                <div className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-slate-700/80 md:border-t-0 md:p-6 md:pt-6">
                  <h3 className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">Qué no validamos</h3>
                  <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
                    {nonValidationItems.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Icons.X className="mt-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.92rem] leading-6 text-slate-500 dark:text-slate-400">
                    No evaluamos el estado del inmueble ni la calidad de los servicios.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700/80 dark:bg-white/5 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:gap-0 md:p-0">
                <div className="space-y-3 md:p-6">
                  <h3 className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">Cómo es la visita</h3>
                  <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-700 dark:text-slate-300">
                    {verifierVisitChecks.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.92rem] leading-6 text-slate-500 dark:text-slate-400">
                    No se realiza inspección técnica ni evaluación de condiciones del inmueble.
                  </p>
                </div>

                <div aria-hidden="true" className="hidden h-full bg-slate-200/85 dark:bg-slate-700/70 md:block" />

                <div className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-slate-700/80 md:border-t-0 md:p-6 md:pt-6">
                  <h3 className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">Quién verifica</h3>
                  <p className="text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
                    La verificación la realiza una persona del equipo o un verificador autorizado por la plataforma.
                  </p>
                  <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-700 dark:text-slate-300">
                    {verifierIdentityPoints.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.92rem] leading-6 text-slate-500 dark:text-slate-400">
                    La validación queda registrada dentro de la plataforma.
                  </p>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center text-[0.98rem] font-semibold leading-7 text-slate-900 dark:text-slate-100">
              No necesitás preparar nada. Solo mostrar la propiedad y acreditar tu vínculo.
            </p>
          </div>
        </section>

        <section>
          <div className="grid gap-6 rounded-[30px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-6 py-6 shadow-[0_24px_48px_-40px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900/70 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-center md:gap-6 md:px-8 md:py-8">
            <div className="flex justify-center md:justify-start">
              <img
                src="/verified-presencial-circular.png"
                alt="Sello Verificado presencialmente"
                className="h-auto w-full max-w-[14rem] object-contain md:max-w-[20rem]"
              />
            </div>

            <div className="space-y-3 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sello</p>
              <h2 className="text-[1.72rem] font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 dark:text-slate-50">
                Un respaldo visible desde el primer vistazo
              </h2>
              <p className="text-[1rem] leading-7 text-slate-600 dark:text-slate-400">
                Indica que la propiedad fue visitada en persona y que el anfitrión fue identificado.
              </p>
              <p className="text-[0.95rem] leading-6 text-slate-600 dark:text-slate-400">
                Es lo primero que ve un huésped al comparar opciones.
              </p>
              <p className="text-[0.92rem] leading-6 text-slate-500 dark:text-slate-400">
                No certifica estado, calidad ni condiciones del inmueble.
              </p>
            </div>
          </div>
        </section>

        <section ref={howItWorksRef} className="scroll-mt-28">
          <div className="rounded-[30px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-6 py-6 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 md:px-8 md:py-8">
            <div className="max-w-3xl space-y-4 md:space-y-5">
              <p className="inline-flex rounded-full border border-emerald-100 bg-emerald-50/90 px-3.5 py-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.28em] text-emerald-900 shadow-[0_10px_24px_-20px_rgba(6,78,59,0.35)] dark:border-emerald-900/80 dark:bg-emerald-950/35 dark:text-emerald-200">
                Cómo funciona
              </p>
              <h2 className="max-w-2xl text-[clamp(2.9rem,5.4vw,4.9rem)] font-semibold leading-[0.88] tracking-[-0.085em] text-slate-950 dark:text-slate-50">
                En cuatro{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">pasos</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[0.14em] z-0 h-[0.28em] rounded-full bg-emerald-100/90 dark:bg-emerald-900/70"
                  />
                </span>
              </h2>
              <div className="max-w-xl border-l-4 border-emerald-200/90 pl-4 dark:border-emerald-800/80">
                <p className="text-[1.04rem] leading-7 text-slate-600 dark:text-slate-300 md:text-[1.14rem]">
                  El proceso es simple y lo coordinamos con vos.
                </p>
              </div>
            </div>

            <div className="relative mt-8 md:mt-10">
              <div
                aria-hidden="true"
                className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-[2px] bg-slate-200 dark:bg-slate-700 md:block"
              />

              <ol className="relative grid grid-cols-1 gap-y-5 md:grid-cols-4 md:gap-x-6 md:gap-y-0 lg:gap-x-8">
                {flowSteps.map((step, index) => {
                  const isActive = activeFlowStep === step.id;

                  return (
                    <motion.li
                      key={step.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: index * 0.08, ease: 'easeOut' }}
                      className="flex flex-col items-center text-center"
                    >
                      <button
                        type="button"
                        aria-label={`Paso ${index + 1}: ${step.title}`}
                        aria-pressed={isActive}
                        aria-describedby={isActive ? `flow-step-tooltip-${step.id}` : undefined}
                        onClick={() => setActiveFlowStep(step.id)}
                        className={[
                          'relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
                          'bg-emerald-950 text-lg font-semibold text-white',
                          'transition-all duration-200',
                          'hover:scale-[1.08] hover:shadow-[0_22px_38px_-16px_rgba(6,78,59,0.46)]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700',
                          'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
                          'md:h-16 md:w-16 md:text-xl',
                          isActive
                            ? 'scale-[1.05] opacity-100 ring-[7px] ring-emerald-100 shadow-[0_28px_52px_-18px_rgba(6,78,59,0.58)] dark:ring-emerald-900/70'
                            : 'opacity-65 shadow-[0_12px_24px_-18px_rgba(6,78,59,0.35)]',
                        ].join(' ')}
                      >
                        <span>{index + 1}</span>
                      </button>

                      <p
                        className={[
                          'mt-3 max-w-[11.5rem] text-balance text-[0.92rem] font-medium leading-5 text-slate-900 dark:text-slate-100 md:text-[0.96rem]',
                          isActive ? 'opacity-100' : 'opacity-70',
                        ].join(' ')}
                      >
                        {step.label}
                      </p>

                      {isActive ? (
                        <motion.div
                          id={`flow-step-tooltip-${step.id}`}
                          role="tooltip"
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="relative mt-3 w-full max-w-[18rem] rounded-xl border border-slate-200/85 bg-white p-4 text-left shadow-[0_24px_48px_-28px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950"
                        >
                          <div
                            aria-hidden="true"
                            className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-slate-200/85 bg-white dark:border-slate-800 dark:bg-slate-950"
                          />
                          <p className="text-[1rem] font-semibold leading-5 text-slate-950 dark:text-slate-50">
                            {step.title}
                          </p>
                          <p className="mt-2 text-[0.94rem] leading-6 text-slate-600 dark:text-slate-400">
                            {step.description}
                          </p>
                        </motion.div>
                      ) : null}
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Video</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Cómo funciona en la práctica
            </h2>
          </div>

          <div className="max-w-2xl space-y-3">
            <div className="aspect-[16/7] overflow-hidden rounded-[18px] border border-dashed border-slate-300/90 bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.08),transparent_46%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94))] dark:border-slate-700 dark:bg-slate-950">
              <div className="flex h-full items-center justify-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/88 text-brand shadow-[0_14px_24px_-22px_rgba(67,56,202,0.3)] dark:border-slate-700 dark:bg-slate-900 dark:text-brand-light">
                  <Icons.Video className="h-5 w-5" />
                </div>
              </div>
            </div>

            <p className="text-[0.94rem] leading-6 text-slate-600 dark:text-slate-400">
              Próximamente guía completa
            </p>
          </div>
        </section>

        <section className="space-y-5 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center space-y-2 text-center">
            <h2 className="text-[2.1rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 dark:text-slate-50 md:text-[2.7rem]">
              Empezá la verificación y destacá tu propiedad
            </h2>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <Button size="lg" onClick={openOnsiteVerification}>
              <Icons.Verified className="h-5 w-5" />
              Quiero verificar mi propiedad
            </Button>
            <p className="text-[0.93rem] leading-6 text-slate-500 dark:text-slate-400">
              Coordinamos la visita en pocos pasos.
            </p>
          </div>
        </section>
      </main>
    </motion.div>
  );
};

export default OnsiteVerificationPage;