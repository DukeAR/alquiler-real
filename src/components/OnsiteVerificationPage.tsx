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

const withoutVerificationPoints = [
  'Dudas constantes',
  'Consultas que no avanzan',
  'Tiempo perdido',
];

const withVerificationPoints = [
  'Consultas claras',
  'Decisiones rápidas',
  'Reservas más concretas',
];

const validationItems = [
  'Ubicación real',
  'Fotos actuales',
  'Datos del aviso',
  'Servicios publicados',
  'Condiciones del lugar',
];

const verifierVisitChecks = [
  'Que la propiedad exista y coincida con la ubicación',
  'Que las fotos representen el estado actual',
  'Que los servicios publicados estén disponibles',
  'Que los datos del aviso sean correctos',
];

const verifierIdentityPoints = [
  'Se identifica antes de la visita',
  'Coordina previamente',
  'No solicita pagos ni datos sensibles',
];

const flowSteps = [
  'Publicás',
  'Coordinamos la visita',
  'Validamos',
  'Recibís el sello',
];

export const OnsiteVerificationPage: React.FC<OnsiteVerificationPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const howItWorksRef = React.useRef<HTMLElement | null>(null);
  const onsiteVerificationTarget = '/verification?mode=onsite&returnTo=/host-dashboard';

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

      <main className="mx-auto flex max-w-4xl flex-col gap-9 px-6 py-6 md:gap-10 md:py-8">
        <section className="max-w-2xl space-y-4">
          <h1 className="text-[clamp(2.35rem,5vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950 dark:text-slate-50">
            Más confianza. Mejores reservas.
          </h1>

          <p className="max-w-xl text-[1rem] leading-7 text-slate-700 dark:text-slate-300">
            Verificamos tu propiedad en persona para que recibas consultas más claras y seguras.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={openOnsiteVerification}>
              <Icons.Verified className="h-5 w-5" />
              Iniciar verificación
            </Button>
            <Button variant="secondary" onClick={() => scrollToSection(howItWorksRef.current)}>
              Ver cómo funciona
            </Button>
          </div>
        </section>

        <section className="space-y-5 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Antes y después</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Qué cambia cuando verificás
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="space-y-4 border-l-2 border-slate-200 pl-5 dark:border-slate-800 md:pr-4">
              <h3 className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">Sin verificación</h3>
              <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
                {withoutVerificationPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Icons.AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 border-l-2 border-brand pl-5 md:pl-6">
              <h3 className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">Con verificación</h3>
              <ul className="space-y-3 text-[0.96rem] leading-7 text-slate-700 dark:text-slate-300">
                {withVerificationPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Validación</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Qué validamos
            </h2>
          </div>

          <ul className="space-y-3 text-[0.96rem] font-medium leading-7 text-slate-800 dark:text-slate-200">
            {validationItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[26px] bg-slate-100/75 px-5 py-5 dark:bg-slate-900/60 md:px-6 md:py-6">
          <div className="space-y-2.5">
            <h2 className="text-[1.45rem] font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 dark:text-slate-50">
              Cuando llega el verificador
            </h2>
            <p className="text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
              Durante la visita se revisa:
            </p>
          </div>

          <ul className="mt-4 space-y-3 text-[0.96rem] font-normal leading-7 text-slate-700 dark:text-slate-300">
            {verifierVisitChecks.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[0.92rem] leading-6 text-slate-500 dark:text-slate-400">
            La visita es simple, no requiere preparación técnica.
          </p>
        </section>

        <section className="rounded-[26px] bg-slate-100/75 px-5 py-5 dark:bg-slate-900/60 md:px-6 md:py-6">
          <div className="space-y-2.5">
            <h2 className="text-[1.45rem] font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 dark:text-slate-50">
              Quién realiza la verificación
            </h2>
            <p className="text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
              La verificación la realiza una persona del equipo o un verificador autorizado por la plataforma.
            </p>
          </div>

          <ul className="mt-4 space-y-3 text-[0.96rem] font-normal leading-7 text-slate-700 dark:text-slate-300">
            {verifierIdentityPoints.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[0.92rem] leading-6 text-slate-500 dark:text-slate-400">
            La validación queda registrada dentro de la plataforma.
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="mx-auto flex max-w-xl flex-col items-center space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sello</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Sello Verificado presencialmente
            </h2>
            <p className="max-w-lg text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
              Muestra de forma visible que la propiedad fue revisada en persona.
            </p>
          </div>

          <div className="flex justify-center">
            <img
              src="/verified-presencial-badge3.png"
              alt="Sello Verificado presencialmente"
              className="h-32 w-32 object-contain md:h-36 md:w-36"
            />
          </div>
        </section>

        <section ref={howItWorksRef} className="scroll-mt-28 space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cómo funciona</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              En cuatro pasos
            </h2>
          </div>

          <ol className="grid gap-4 text-[0.95rem] text-slate-700 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="text-sm font-semibold text-brand">
                  {index + 1}
                </span>
                <p className="pt-0.5 font-medium leading-7 text-slate-900 dark:text-slate-100">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4 border-t border-slate-200/85 pt-8 dark:border-slate-800 md:pt-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Video</p>
            <h2 className="text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
              Próximamente guía completa
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
              Verificar mejora cómo te eligen.
            </h2>
          </div>

          <div className="flex justify-center">
            <Button size="lg" onClick={openOnsiteVerification}>
              <Icons.Verified className="h-5 w-5" />
              Iniciar verificación
            </Button>
          </div>
        </section>
      </main>
    </motion.div>
  );
};

export default OnsiteVerificationPage;