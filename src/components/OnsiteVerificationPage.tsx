import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

interface OnsiteVerificationPageProps {
  onBack: () => void;
}

const frictionPoints = [
  'Consultas que no avanzan',
  'Dudas constantes',
  'Tiempo perdido',
  'Reservas que se caen',
];

const validationItems = [
  'Ubicación confirmada',
  'Fotos reales',
  'Datos del aviso validados',
  'Servicios comprobados',
  'Condiciones verificadas',
];

const flowSteps = [
  'Publicás tu propiedad',
  'Coordinamos la visita',
  'Validamos la información clave',
  'Se activa el sello presencial',
];

const impactPoints = [
  'Más visibilidad',
  'Mejores consultas',
  'Menos fricción',
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
      className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950"
    >
      <PageHeader
        onBack={onBack}
        heading="Verificación presencial"
        centerHeading
        className="relative mx-auto mb-0 max-w-5xl items-center gap-2 px-6 py-2"
      />

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-6 md:gap-16 md:py-8">
        <section className="overflow-hidden rounded-[36px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] px-7 py-9 shadow-[0_32px_64px_-42px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900 md:px-10 md:py-11">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.95fr)] lg:items-center">
            <div className="space-y-6">
              <SectionTitle
                eyebrow="Verificación presencial"
                as="h1"
                heading="Más confianza. Mejores reservas."
                description="Las propiedades verificadas reciben consultas más claras, menos fricción y decisiones más rápidas."
                className="max-w-3xl"
                headingClassName="text-[clamp(2.4rem,5vw,4rem)] leading-[0.98] tracking-[-0.06em] text-slate-950 dark:text-slate-50"
                descriptionClassName="max-w-2xl text-[1.02rem] leading-8 text-slate-700 dark:text-slate-300"
              />

              <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
                Un verificador revisa tu propiedad en persona y valida la información clave del aviso.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={openOnsiteVerification}>
                  <Icons.Verified className="h-5 w-5" />
                  Quiero verificar mi propiedad
                </Button>
                <Button size="lg" variant="secondary" onClick={() => scrollToSection(howItWorksRef.current)}>
                  Ver cómo funciona
                </Button>
              </div>
            </div>

            <Card
              padding="none"
              className="overflow-hidden rounded-[30px] border-brand/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98))] p-6 text-white shadow-[0_32px_60px_-40px_rgba(15,23,42,0.48)] md:p-7"
            >
              <div className="space-y-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-white">
                  <Icons.ShieldCheck className="h-6 w-6" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Qué cambia</p>
                  <p className="text-[1.55rem] font-semibold leading-[1.16] tracking-[-0.03em] text-white">
                    Más respaldo visible desde el primer vistazo.
                  </p>
                </div>

                <div className="space-y-3">
                  {impactPoints.map((point) => (
                    <div key={point} className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3.5 text-[0.95rem] text-slate-100/92">
                      <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <Card
            padding="none"
            className="rounded-[30px] border-slate-200/85 bg-white/98 p-6 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 md:p-7"
          >
            <SectionTitle
              eyebrow="Problema"
              as="h2"
              heading="Publicar sin validar genera fricción."
              className="max-w-lg"
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {frictionPoints.map((point) => (
                <div key={point} className="flex items-center gap-3 rounded-[20px] border border-slate-200/80 bg-slate-50/85 px-4 py-4 text-[0.95rem] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                  <Icons.AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            padding="none"
            className="rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-6 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.18)] dark:border-brand/20 dark:bg-slate-900 md:p-7"
          >
            <SectionTitle
              eyebrow="Solución"
              as="h2"
              heading="La verificación cambia la calidad de todo."
              description="Cuando la información está validada, el huésped decide mejor y vos filtrás mejor."
              className="max-w-xl"
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'La propiedad muestra respaldo real.',
                'El huésped entiende mejor qué está viendo.',
                'Las consultas llegan más enfocadas.',
                'La decisión se mueve más rápido.',
              ].map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-[18px] border border-white/80 bg-white/86 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-700 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-300">
                  <Icons.CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(17rem,0.98fr)] lg:items-start">
          <Card
            padding="none"
            className="rounded-[32px] border-slate-200/85 bg-white/98 p-6 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 md:p-7"
          >
            <SectionTitle
              eyebrow="Validaciones"
              as="h2"
              heading="Qué validamos"
              className="max-w-lg"
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {validationItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/85 px-4 py-4 text-[0.95rem] font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            padding="none"
            className="rounded-[32px] border-brand/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(239,246,255,0.94))] p-6 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.16)] dark:border-brand/20 dark:bg-slate-900 md:p-7"
          >
            <SectionTitle
              eyebrow="Sello"
              as="h2"
              heading="Sello Verificado presencialmente"
              description="Indica que la propiedad fue revisada en persona."
              className="max-w-sm"
            />

            <div className="mt-6 rounded-[24px] border border-white/90 bg-white/92 p-6 shadow-[0_20px_36px_-30px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/75">
              <div className="flex flex-col items-center gap-5 text-center">
                <img
                  src="/verified-presencial-badge3.png"
                  alt="Sello Verificado presencialmente"
                  className="h-28 w-28 object-contain"
                />
                <p className="max-w-xs text-[0.92rem] leading-6 text-slate-600 dark:text-slate-400">
                  El sello aparece como respaldo visible para que el huésped identifique rápido que hubo revisión presencial.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section ref={howItWorksRef} className="scroll-mt-28 space-y-6">
          <SectionTitle
            eyebrow="Cómo funciona"
            as="h2"
            heading="Un proceso corto y claro"
            className="max-w-2xl"
          />

          <ol className="grid gap-5 md:grid-cols-4">
            {flowSteps.map((step, index) => (
              <li key={step} className="rounded-[26px] border border-slate-200/85 bg-white/98 p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(67,56,202,0.42)]">
                    {index + 1}
                  </span>
                  <p className="text-[0.98rem] font-semibold leading-7 text-slate-900 dark:text-slate-100">
                    {step}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Impacto"
            as="h2"
            heading="Lo que mejora cuando verificás"
            className="max-w-2xl"
          />

          <div className="grid gap-5 md:grid-cols-3">
            {impactPoints.map((point, index) => (
              <Card
                key={point}
                padding="none"
                className={cn(
                  'rounded-[26px] p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)]',
                  index === 0 && 'border-brand/15 bg-brand/[0.06] dark:border-brand/20 dark:bg-brand/10',
                  index === 1 && 'border-slate-200/85 bg-white/98 dark:border-slate-800 dark:bg-slate-900',
                  index === 2 && 'border-emerald-200/70 bg-emerald-50/82 dark:border-emerald-900/30 dark:bg-emerald-950/12',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/85 text-brand shadow-[0_14px_26px_-22px_rgba(67,56,202,0.32)] dark:bg-slate-950/75 dark:text-brand-light">
                    <Icons.CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-[1rem] font-semibold leading-7 text-slate-900 dark:text-slate-100">{point}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Video"
            as="h2"
            heading="Próximamente guía completa"
            className="max-w-2xl"
          />

          <Card
            padding="none"
            className="rounded-[32px] border border-dashed border-slate-300/90 bg-white/98 p-5 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900 md:p-7"
          >
            <div className="space-y-5">
              <div className="aspect-video overflow-hidden rounded-[24px] border border-slate-200/85 bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.1),transparent_46%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94))] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex h-full items-center justify-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/88 text-brand shadow-[0_18px_32px_-24px_rgba(67,56,202,0.32)] dark:border-slate-700 dark:bg-slate-900 dark:text-brand-light">
                    <Icons.Video className="h-7 w-7" />
                  </div>
                </div>
              </div>

              <p className="text-[0.95rem] leading-7 text-slate-600 dark:text-slate-400">
                Próximamente guía completa
              </p>
            </div>
          </Card>
        </section>

        <section className="overflow-hidden rounded-[34px] bg-slate-950 px-7 py-9 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.42)] dark:bg-slate-900 md:px-10 md:py-10">
          <div className="max-w-3xl space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">CTA final</p>
              <h2 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] text-white md:text-[40px]">
                Verificar mejora cómo te eligen.
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={openOnsiteVerification}>
                <Icons.Verified className="h-5 w-5" />
                Quiero verificar mi propiedad
              </Button>
              <Button size="lg" variant="secondary" onClick={openPublishingFlow}>
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