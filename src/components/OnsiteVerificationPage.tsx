import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

interface OnsiteVerificationPageProps {
  onBack: () => void;
}

const heroBenefits = [
  'Más visibilidad',
  'Consultas más claras',
  'Menos fricción',
];

const conversionPoints = [
  'Menos consultas irrelevantes',
  'Decisiones más rápidas',
  'Reservas más concretas',
];

const validationItems = [
  'Ubicación confirmada',
  'Fotos reales',
  'Datos validados',
  'Servicios comprobados',
  'Condiciones verificadas',
];

const flowSteps = [
  'Publicás tu propiedad',
  'Coordinamos la visita',
  'Validamos la información clave',
  'Se activa el sello presencial',
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

  const openPublishingFlow = () => {
    navigateWithAuthTarget('/host-dashboard');
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

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-6 md:gap-10 md:py-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.95))] px-6 py-7 shadow-[0_28px_56px_-42px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:px-8 md:py-9">
          <div className="max-w-3xl space-y-4">
              <SectionTitle
                eyebrow="Verificación presencial"
                as="h1"
                heading="Más confianza. Mejores reservas."
                description="Las propiedades verificadas reciben consultas más claras, menos fricción y decisiones más rápidas."
                className="max-w-3xl"
                headingClassName="text-[clamp(2.4rem,5vw,4rem)] leading-[0.98] tracking-[-0.06em] text-slate-950 dark:text-slate-50"
                descriptionClassName="max-w-2xl text-[1rem] leading-7 text-slate-700 dark:text-slate-300"
              />

              <p className="max-w-2xl text-[0.96rem] leading-7 text-slate-600 dark:text-slate-400">
                Revisamos tu propiedad en persona y validamos la información clave del aviso.
              </p>

              <ul className="grid gap-2.5 text-[0.96rem] font-medium text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                {heroBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5">
                    <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={openOnsiteVerification}>
                  <Icons.Verified className="h-5 w-5" />
                  Iniciar verificación
                </Button>
                <Button variant="secondary" onClick={() => scrollToSection(howItWorksRef.current)}>
                  Cómo funciona
                </Button>
              </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/85 bg-white/98 px-6 py-5 shadow-[0_22px_44px_-36px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900 md:px-7 md:py-6">
          <SectionTitle
            eyebrow="Qué cambia"
            as="h2"
            heading="Publicar sin validar genera dudas."
            description="La verificación elimina fricción y mejora la calidad de las reservas."
            className="max-w-2xl"
          />

          <ul className="mt-5 space-y-3 text-[0.96rem] leading-7 text-slate-700 dark:text-slate-300">
            {conversionPoints.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-7 border-t border-slate-200/85 pt-7 dark:border-slate-800 md:grid-cols-[minmax(0,1.05fr)_minmax(15rem,0.95fr)] md:pt-8">
          <div className="space-y-5">
            <SectionTitle
              eyebrow="Validaciones"
              as="h2"
              heading="Qué validamos"
              className="max-w-lg"
            />

            <ul className="space-y-3 text-[0.96rem] font-medium text-slate-800 dark:text-slate-200">
              {validationItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5 md:pt-1">
            <SectionTitle
              eyebrow="Sello"
              as="h2"
              heading="Sello Verificado presencialmente"
              description="Confirma que la propiedad fue revisada en persona y suma respaldo visible en el aviso."
              className="max-w-sm"
            />

            <img
              src="/verified-presencial-badge3.png"
              alt="Sello Verificado presencialmente"
              className="h-28 w-28 object-contain"
            />
          </div>
        </section>

        <section ref={howItWorksRef} className="scroll-mt-28 space-y-4 border-t border-slate-200/85 pt-7 dark:border-slate-800 md:pt-8">
          <SectionTitle
            eyebrow="Cómo funciona"
            as="h2"
            heading="Un proceso corto y claro"
            className="max-w-2xl"
          />

          <ol className="grid gap-3 text-[0.95rem] text-slate-700 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-[0_14px_26px_-18px_rgba(67,56,202,0.42)]">
                  {index + 1}
                </span>
                <p className="pt-0.5 font-medium leading-6 text-slate-900 dark:text-slate-100">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4 border-t border-slate-200/85 pt-7 dark:border-slate-800 md:pt-8">
          <SectionTitle
            eyebrow="Video"
            as="h2"
            heading="Próximamente guía completa"
            className="max-w-2xl"
          />

          <div className="rounded-[28px] border border-dashed border-slate-300/90 bg-white/98 p-4 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900 md:p-5">
            <div className="space-y-4">
              <div className="aspect-video overflow-hidden rounded-[20px] border border-slate-200/85 bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.1),transparent_46%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94))] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex h-full items-center justify-center">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/88 text-brand shadow-[0_16px_28px_-24px_rgba(67,56,202,0.3)] dark:border-slate-700 dark:bg-slate-900 dark:text-brand-light">
                    <Icons.Video className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <p className="text-[0.94rem] leading-6 text-slate-600 dark:text-slate-400">
                Próximamente guía completa
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] bg-slate-950 px-6 py-5 shadow-[0_26px_52px_-42px_rgba(15,23,42,0.38)] dark:bg-slate-900 md:px-7 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-[2.3rem]">
                Verificá tu propiedad.
              </h2>
              <p className="text-[0.95rem] leading-6 text-slate-300">
                Sumá respaldo visible y recibí consultas más concretas.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={openOnsiteVerification}>
                <Icons.Verified className="h-5 w-5" />
                Iniciar verificación
              </Button>
              <Button variant="secondary" onClick={openPublishingFlow}>
                <Icons.ArrowRight className="h-5 w-5" />
                Publicar propiedad
              </Button>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
};

export default OnsiteVerificationPage;