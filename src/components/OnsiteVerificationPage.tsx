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
    label: 'Publicás',
    title: 'Publicás tu propiedad',
    description: 'Cargás la información básica del aviso para que sea visible.',
  },
  {
    id: 'schedule',
    label: 'Coordinamos',
    title: 'Coordinamos la visita',
    description: 'Elegís día y horario para la verificación.',
  },
  {
    id: 'verify',
    label: 'Validamos',
    title: 'Validamos identidad y acceso',
    description: 'Confirmamos quién sos y tu vínculo con el lugar.',
  },
  {
    id: 'seal',
    label: 'Sello',
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
        className="relative mx-auto mb-0 max-w-4xl items-center gap-2 px-6 py-2"
      />

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-7 md:gap-14 md:py-9">
        <section className="max-w-3xl space-y-5">
          <h1 className="text-[clamp(2.35rem,5vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 dark:text-slate-50">
            Más confianza. Mejores reservas.
          </h1>

          <p className="max-w-2xl text-[0.98rem] leading-6 text-slate-700 dark:text-slate-300">
            Verificamos en persona identidad y vínculo con la propiedad.
          </p>

          <ul className="flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 text-[0.92rem] font-medium leading-6 text-slate-600 dark:text-slate-300">
            {heroBenefitPoints.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-2.5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={openOnsiteVerification}>
                <Icons.Verified className="h-5 w-5" />
                Quiero verificar mi propiedad
              </Button>
              <Button variant="secondary" onClick={() => scrollToSection(howItWorksRef.current)}>
                Ver cómo funciona
              </Button>
            </div>
            <p className="text-[0.93rem] leading-6 text-slate-500 dark:text-slate-400">
              Se coordina una visita, no lleva más de unos minutos.
            </p>
          </div>

          <p className="text-[0.95rem] leading-6 text-slate-600 dark:text-slate-400">
            Las propiedades verificadas se destacan automáticamente en los resultados.
          </p>
        </section>

        <section className="space-y-6 rounded-[30px] bg-slate-100/75 px-6 py-6 dark:bg-slate-900/60 md:px-8 md:py-7">
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

          <p className="text-[0.95rem] leading-6 text-slate-600 dark:text-slate-400">
            Esto impacta directamente en cómo te contactan y qué tipo de consultas recibís.
          </p>
        </section>

        <section className="space-y-6 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <h2 className="text-[1.62rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Qué revisa esta verificación
            </h2>
          </div>

          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
            <div className="space-y-7">
              <div className="space-y-3">
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

              <div className="space-y-3">
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

            <div className="space-y-7">
              <div className="space-y-3">
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

              <div className="space-y-3">
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

          <p className="text-[0.95rem] leading-6 text-slate-600 dark:text-slate-400">
            No necesitás preparar nada. Solo mostrar la propiedad y acreditar tu vínculo.
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="grid gap-6 rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-6 py-6 shadow-[0_24px_48px_-40px_rgba(15,23,42,0.14)] dark:bg-slate-900/70 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-center md:gap-8 md:px-8 md:py-8">
            <div className="flex justify-center md:justify-start">
              <img
                src="/verified-presencial-badge3.png"
                alt="Sello Verificado presencialmente"
                className="h-48 w-48 object-contain md:h-52 md:w-52"
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

        <section ref={howItWorksRef} className="scroll-mt-28 space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cómo funciona</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              En cuatro pasos
            </h2>
            <p className="text-[0.95rem] leading-6 text-slate-600 dark:text-slate-400">
              El proceso es simple y lo coordinamos con vos.
            </p>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="relative mx-auto min-w-[20rem] max-w-3xl px-1 pb-32 pt-2 md:pb-28">
              <div
                aria-hidden="true"
                className="absolute left-[calc(12.5%+1.15rem)] right-[calc(12.5%+1.15rem)] top-9 h-px bg-slate-200 dark:bg-slate-700"
              />

              <ol className="relative grid grid-cols-4 gap-3 text-[0.95rem] text-slate-700 dark:text-slate-300 md:gap-8">
                {flowSteps.map((step, index) => {
                  const isActive = activeFlowStep === step.id;
                  const isFirstStep = index === 0;
                  const isLastStep = index === flowSteps.length - 1;

                  return (
                    <li key={step.id} className="relative flex flex-col items-center text-center">
                      <button
                        type="button"
                        aria-label={`Paso ${index + 1}: ${step.title}`}
                        aria-pressed={isActive}
                        aria-describedby={isActive ? `flow-step-tooltip-${step.id}` : undefined}
                        onClick={() => setActiveFlowStep(step.id)}
                        className={[
                          'relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
                          'bg-[var(--color-primary)] text-lg font-semibold text-white',
                          'shadow-[0_14px_28px_-18px_rgba(76,29,149,0.58)] transition-all duration-200',
                          'hover:scale-[1.08] hover:shadow-[0_22px_38px_-18px_rgba(76,29,149,0.46)]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                          'focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950',
                          'md:h-16 md:w-16 md:text-xl',
                          isActive
                            ? 'scale-[1.05] ring-4 ring-violet-200/80 shadow-[0_22px_40px_-16px_rgba(76,29,149,0.5)] dark:ring-violet-500/25'
                            : '',
                        ].join(' ')}
                      >
                        <span>{index + 1}</span>
                      </button>

                      <p className="mt-3 whitespace-nowrap text-[0.81rem] font-medium leading-5 text-slate-900 dark:text-slate-100 md:text-[0.88rem]">
                        {step.label}
                      </p>

                      {isActive ? (
                        <motion.div
                          id={`flow-step-tooltip-${step.id}`}
                          role="tooltip"
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className={[
                            'absolute top-full z-10 mt-5 w-[13.75rem] rounded-xl border border-slate-200/85',
                            'bg-white p-4 text-left shadow-[0_24px_48px_-28px_rgba(15,23,42,0.3)]',
                            'dark:border-slate-800 dark:bg-slate-900',
                            isFirstStep ? 'left-0' : '',
                            isLastStep ? 'right-0' : '',
                            !isFirstStep && !isLastStep ? 'left-1/2 -translate-x-1/2' : '',
                          ].join(' ')}
                        >
                          <p className="text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50">
                            {step.title}
                          </p>
                          <p className="mt-2 text-[0.92rem] leading-6 text-slate-600 dark:text-slate-400">
                            {step.description}
                          </p>
                        </motion.div>
                      ) : null}
                    </li>
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