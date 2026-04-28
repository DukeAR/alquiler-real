import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

interface AboutPageProps {
  onBack: () => void;
}

type AboutTab = 'official' | 'owners' | 'guests';

type IconType = React.ComponentType<{ className?: string }>;

type ScopeCard = {
  title: string;
  points: string[];
  cardClassName: string;
  pointClassName: string;
  icon: IconType;
  iconClassName: string;
  iconWrapperClassName: string;
  pointIconClassName: string;
};

type VerificationLevel = {
  title: string;
  description: string;
  icon: IconType;
  cardClassName: string;
  accentClassName: string;
  iconClassName: string;
  iconWrapperClassName: string;
};

type FutureCard = {
  title: string;
  description: string;
  cardClassName: string;
  badgeClassName: string;
  icon: IconType;
  iconClassName: string;
  iconWrapperClassName: string;
};

type RoleBenefit = {
  title: string;
  description: string;
  icon: IconType;
};

type StepCardTone = 'brand' | 'success';

type StepCard = {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconType;
  steps: string[];
  tone: StepCardTone;
};

const aboutTabs: Array<{ id: AboutTab; label: string }> = [
  { id: 'official', label: 'Proyecto' },
  { id: 'owners', label: 'Anfitriones' },
  { id: 'guests', label: 'Huéspedes' },
];

const aboutTabButtonClass = 'app-button-base h-11 flex-1 rounded-[14px] px-4 text-[0.92rem] font-semibold tracking-[-0.01em]';
const aboutFeatureCardClass = 'space-y-3 rounded-[24px] border-slate-200/85 bg-white/98 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900';
const projectCardTitleClass = 'text-[0.95rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50';
const projectCardBodyClass = 'text-[0.88rem] leading-6 text-slate-600 dark:text-slate-300';
const projectCardIconShellClass = 'inline-flex h-10 w-10 items-center justify-center rounded-[18px]';

const projectScopeCards: ScopeCard[] = [
  {
    title: 'Qué ya está comprobado',
    points: [
      'Quién publica',
      'Ubicación real',
      'Fotos del lugar',
      'Datos básicos verificados',
    ],
    cardClassName: 'rounded-[24px] border border-brand/15 bg-brand/[0.06] p-5 shadow-[0_16px_34px_-28px_rgba(67,56,202,0.14)] dark:border-brand/20 dark:bg-brand/10',
    pointClassName: 'flex items-start gap-3 rounded-[18px] border border-brand/10 bg-white/88 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-800 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] dark:border-brand/20 dark:bg-slate-950/70 dark:text-slate-100',
    icon: Icons.Verified,
    iconClassName: 'text-brand dark:text-brand-light',
    iconWrapperClassName: 'bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light',
    pointIconClassName: 'text-emerald-500/80 dark:text-emerald-300/80',
  },
  {
    title: 'Qué sigue dependiendo de vos',
    points: [
      'Precio',
      'Reglas',
      'Opiniones',
      'Detalles del lugar',
    ],
    cardClassName: 'rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900',
    pointClassName: 'flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/82 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-700 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300',
    icon: Icons.Layers,
    iconClassName: 'text-slate-500 dark:text-slate-300',
    iconWrapperClassName: 'bg-slate-100 text-slate-700 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-slate-100',
    pointIconClassName: 'text-slate-400 dark:text-slate-500',
  },
];

const verificationLevels: VerificationLevel[] = [
  {
    title: 'Verificación presencial',
    description: 'Alguien fue al lugar y confirmó que existe y coincide.',
    icon: Icons.Home,
    cardClassName: 'rounded-[24px] border border-brand/15 bg-brand/[0.06] p-5 shadow-[0_16px_34px_-28px_rgba(67,56,202,0.14)] dark:border-brand/20 dark:bg-brand/10',
    accentClassName: 'hidden',
    iconClassName: 'text-brand dark:text-brand-light',
    iconWrapperClassName: 'bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light',
  },
  {
    title: 'Verificación digital',
    description: 'Información cargada y validada por quien publica.',
    icon: Icons.Search,
    cardClassName: 'rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900',
    accentClassName: 'hidden',
    iconClassName: 'text-slate-500 dark:text-slate-300',
    iconWrapperClassName: 'bg-slate-100 text-slate-700 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-slate-100',
  },
];

const futureCards: FutureCard[] = [
  {
    title: 'Más claridad en cada aviso',
    description: 'Menos dudas antes de escribir o reservar',
    cardClassName: 'rounded-[24px] border border-brand/15 bg-brand/[0.06] p-5 shadow-[0_16px_34px_-28px_rgba(67,56,202,0.14)] dark:border-brand/20 dark:bg-brand/10',
    badgeClassName: 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light',
    icon: Icons.Lightbulb,
    iconClassName: 'text-brand dark:text-brand-light',
    iconWrapperClassName: 'bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light',
  },
  {
    title: 'Más cosas verificadas',
    description: 'Cada aviso muestra mejor qué es real',
    cardClassName: 'rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900',
    badgeClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
    icon: Icons.Search,
    iconClassName: 'text-slate-500 dark:text-slate-300',
    iconWrapperClassName: 'bg-slate-100 text-slate-700 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-slate-100',
  },
  {
    title: 'Decidir más rápido',
    description: 'Menos vueltas, más certeza',
    cardClassName: 'rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] dark:border-emerald-900/25 dark:bg-emerald-950/10',
    badgeClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
    icon: Icons.Zap,
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
    iconWrapperClassName: 'bg-emerald-500/12 text-emerald-700 shadow-[0_16px_30px_-24px_rgba(16,185,129,0.34)] dark:bg-emerald-500/12 dark:text-emerald-300',
  },
];

const hostDifferentiators: RoleBenefit[] = [
  {
    title: 'Filtrar mejor a quién responder',
    description: 'No todas las consultas valen lo mismo. Podés priorizar mejor.',
    icon: Icons.BadgeCheck,
  },
  {
    title: 'Ver historial del usuario',
    description: 'Antes de seguir, ves más información sobre ese perfil.',
    icon: Icons.Search,
  },
  {
    title: 'Decidir con más contexto',
    description: 'Aceptás con más información y menos intuición.',
    icon: Icons.Layers,
  },
];

const hostVerificationChecklist = [
  'Ubicación confirmada',
  'Fotos reales',
  'Datos validados',
  'Servicios comprobados',
  'Condiciones verificadas',
];

const guestBenefits: RoleBenefit[] = [
  {
    title: 'Quién publica',
    description: 'Si hubo identidad confirmada, no hablás con un perfil anónimo.',
    icon: Icons.BadgeCheck,
  },
  {
    title: 'Dónde está el lugar',
    description: 'Podés revisar si la ubicación verificada coincide con la propiedad.',
    icon: Icons.MapPin,
  },
  {
    title: 'Qué dijeron otros',
    description: 'Las reseñas reales muestran cómo fue la estadía para otras personas.',
    icon: Icons.Search,
  },
];

const guestSteps: StepCard = {
  eyebrow: 'Cómo usarlo',
  title: 'Qué revisar antes de reservar',
  description: 'Un recorrido corto para no decidir solo por fotos o apuro.',
  icon: Icons.ListTodo,
  steps: [
    'Elegí la zona y compará propiedades.',
    'Revisá quién publica, si hay identidad confirmada, ubicación verificada y reseñas reales.',
    'Hacé preguntas concretas antes de avanzar.',
    'Coordiná el pago cuando ya hayas revisado ubicación, reseñas reales y reglas básicas.',
  ],
  tone: 'success',
};

const ScopeCardBlock = ({ card }: { card: ScopeCard }) => {
  const Icon = card.icon;

  return (
    <div className={cn('relative h-full overflow-hidden', card.cardClassName)}>
      <div className="relative flex h-full flex-col gap-4">
        <div className={cn(projectCardIconShellClass, card.iconWrapperClassName)}>
          <Icon className={cn('h-6 w-6', card.iconClassName)} />
        </div>

        <h3 className={projectCardTitleClass}>
          {card.title}
        </h3>

        <ul className="space-y-2.5">
          {card.points.map((point) => (
            <li key={point} className={card.pointClassName}>
              <Icons.CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', card.pointIconClassName)} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const VerificationLevelCard = ({ level }: { level: VerificationLevel }) => {
  const Icon = level.icon;

  return (
    <div className={cn('relative h-full overflow-hidden', level.cardClassName)}>
      <div className="relative flex h-full flex-col gap-4">
        <div className={cn(projectCardIconShellClass, level.iconWrapperClassName)}>
          <Icon className={cn('h-5 w-5', level.iconClassName)} />
        </div>

        <div className="space-y-1">
          <h3 className={projectCardTitleClass}>
            {level.title}
          </h3>
          <p className={projectCardBodyClass}>
            {level.description}
          </p>
        </div>
      </div>
    </div>
  );
};

const RoleBenefitCard = ({ benefit }: { benefit: RoleBenefit }) => {
  const Icon = benefit.icon;

  return (
    <Card padding="lg" className={aboutFeatureCardClass}>
      <Icon className="h-6 w-6 text-brand" />
      <h3 className={projectCardTitleClass}>{benefit.title}</h3>
      <p className={projectCardBodyClass}>{benefit.description}</p>
    </Card>
  );
};

const StepListCard = ({ content }: { content: StepCard }) => {
  const Icon = content.icon;
  const isBrand = content.tone === 'brand';

  return (
    <Card
      padding="none"
      className={isBrand
        ? 'rounded-[28px] border-brand/15 bg-brand/[0.06] p-6 dark:border-brand/20 dark:bg-brand/10 md:p-7'
        : 'rounded-[28px] border-emerald-200/70 bg-emerald-50/78 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/14 md:p-7'}
    >
      <div className="space-y-4">
        <SectionTitle
          eyebrow={content.eyebrow}
          as="h3"
          heading={
            <span className="flex items-center gap-2 text-slate-950 dark:text-slate-50">
              <Icon className={cn('h-5 w-5', isBrand ? 'text-brand' : 'text-emerald-600 dark:text-emerald-300')} />
              {content.title}
            </span>
          }
          description={content.description}
          headingClassName="text-slate-950 dark:text-slate-50"
          eyebrowClassName={isBrand ? 'text-brand/90 dark:text-brand-light/80' : undefined}
          descriptionClassName="text-slate-700 dark:text-slate-300"
        />

        <ol className="space-y-2.5">
          {content.steps.map((step, index) => (
            <li
              key={step}
              className={isBrand
                ? 'flex gap-3 rounded-[18px] border border-brand/10 bg-white/88 p-3.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] dark:border-brand/20 dark:bg-slate-950/70'
                : 'flex gap-3 rounded-[18px] border border-emerald-200/60 bg-white/88 p-3.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] dark:border-emerald-900/30 dark:bg-slate-950/70'}
            >
              <span className={isBrand
                ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shadow-[0_14px_28px_-20px_rgba(67,56,202,0.42)]'
                : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/88 text-xs font-semibold text-white shadow-[0_14px_28px_-20px_rgba(16,185,129,0.34)]'}
              >
                {index + 1}
              </span>
              <span className="app-body-sm leading-6 text-slate-700 dark:text-slate-200">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
};

export const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<AboutTab>('official');
  const hostVerificationRef = React.useRef<HTMLElement | null>(null);
  const hostVideoRef = React.useRef<HTMLElement | null>(null);

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

  const scrollToSection = (element: HTMLElement | null) => {
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950"
    >
      <PageHeader
        onBack={onBack}
        heading={(
          <>
            <span>Cómo </span>
            <span className="ml-1 text-brand">funciona</span>
          </>
        )}
        centerHeading
        contentClassName="w-max translate-y-[10px]"
        headingClassName="mb-0 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-brand/20 bg-brand/10 px-5 py-2.5 text-[1.35rem] font-semibold tracking-[-0.05em] leading-none text-slate-950 shadow-[0_16px_30px_-24px_rgba(67,56,202,0.24)]"
        headingStyle={{ marginBottom: 0, lineHeight: 1, color: 'var(--color-text)', fontSize: '1.5rem' }}
        className="relative mx-auto mb-0 max-w-5xl items-center gap-2 px-6 py-1 md:py-1"
      />

      <main className="mx-auto max-w-5xl px-6 py-3 space-y-4">
        <div className="app-card app-card-muted mt-10 rounded-[26px] p-1.5 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Información sobre la plataforma">
          <div className="flex flex-col gap-1 sm:flex-row">
            {aboutTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  aboutTabButtonClass,
                  activeTab === tab.id
                    ? 'bg-white text-slate-950 shadow-[0_16px_28px_-22px_rgba(15,23,42,0.16)] dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-500 hover:bg-white/75 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-50',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'official' ? (
            <motion.div
              key="official"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pt-0.5 md:pt-1"
            >
              <div className="mx-auto flex w-full max-w-[940px] flex-col gap-5 md:gap-6">
                <section className="relative mb-4 overflow-hidden rounded-[30px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-6 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.16)] md:p-10 dark:border-slate-800 dark:bg-slate-900">
                  <div className="absolute inset-0 hidden" />

                  <div className="relative flex flex-col gap-5">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                      <Icons.Layers className="h-6 w-6" />
                    </div>

                    <div className="max-w-[640px] space-y-3 text-left">
                      <h1 className="max-w-[640px] text-[clamp(2rem,3.6vw,2.5rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-slate-900 dark:text-slate-50">
                        ¿Te pasó de reservar un alquiler y no estar del todo tranquilo?
                      </h1>

                      <p className="max-w-[620px] mb-[10px] text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        Mirás fotos sin saber si son actuales. Dudás si la ubicación es realmente esa. Y muchas veces no tenés claro quién está del otro lado.
                      </p>

                      <p className="max-w-[620px] mb-[10px] text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        Eso le pasa a todo el mundo. Y cuando se trata de vacaciones, no debería ser así.
                      </p>

                      <p className="max-w-[620px] mb-[10px] text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        <span className="inline-block mt-[12px] mb-[12px] rounded-full bg-[#ECFDF5] px-[12px] py-[6px] text-[14px] font-semibold text-[#166534]">
                          No es un problema de opciones. Es un problema de confianza.
                        </span>
                      </p>

                      <p className="max-w-[620px] mb-[10px] text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        Alquiler Real nace para cambiar eso: para que puedas ver, desde el principio, qué parte del aviso está realmente comprobada.
                      </p>

                      <p className="max-w-[620px] mt-[6px] mb-[10px] text-[0.9rem] font-semibold leading-[1.7] text-[#111827]">
                        Para que decidir no dependa de adivinar.
                      </p>

                      <p className="max-w-[620px] mt-[16px] mb-[10px] text-[20px] font-bold leading-[1.7] text-[#163329]">
                        Menos incertidumbre. Más claridad.
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2.5">
                        <div className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200/85 bg-white px-3.5 py-2.5 text-[0.88rem] font-medium text-slate-800 shadow-none dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                          <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-400">01</span>
                          <span>Elegís.</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200/85 bg-white px-3.5 py-2.5 text-[0.88rem] font-medium text-slate-800 shadow-none dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                          <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-400">02</span>
                          <span>Hablás.</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200/85 bg-white px-3.5 py-2.5 text-[0.88rem] font-medium text-slate-800 shadow-none dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                          <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-400">03</span>
                          <span>Chequeás.</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200/85 bg-white px-3.5 py-2.5 text-[0.88rem] font-medium text-slate-800 shadow-none dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                          <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-400">04</span>
                          <span>Reservás.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-2.5 md:grid-cols-2 md:items-stretch">
                  {projectScopeCards.map((card) => (
                    <ScopeCardBlock key={card.title} card={card} />
                  ))}
                </section>

                <section className="space-y-4 rounded-[30px] border border-slate-200/85 bg-white/96 p-5 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.16)] md:p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-2.5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                      <Icons.ShieldCheck className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <p className="app-eyebrow">Verificación</p>
                      <h2 className="text-[clamp(1.4rem,2vw,1.8rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                        Qué significa que algo esté verificado
                      </h2>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2 md:items-stretch">
                    {verificationLevels.map((level) => (
                      <VerificationLevelCard key={level.title} level={level} />
                    ))}
                  </div>

                  <p className={projectCardBodyClass}>
                    Aunque esté verificado, hay cosas que siguen siendo decisión tuya: precio, reglas y experiencias de otros.
                  </p>
                </section>

                <section className="mx-auto mb-8 mt-12 max-w-[680px] text-center">
                  <h2 className="mb-4 text-[36px] font-bold leading-[1.08] tracking-[-0.04em] text-[#0F172A]">
                    Alquilar debería ser simple.
                  </h2>

                  <p className="mb-4 text-[16px] leading-[1.7] text-[#5B6470]">
                    No debería ser una apuesta. No deberías tener que dudar de cada foto, de cada ubicación o de cada persona con la que hablás.
                  </p>

                  <p className="mb-4 text-[16px] leading-[1.7] text-[#5B6470]">
                    Alquiler Real existe para eso: para que puedas elegir con información clara, hablar con más confianza y reservar sabiendo mejor dónde te estás metiendo.
                  </p>

                  <p className="text-[18px] font-semibold leading-[1.7] text-[#163329]">
                    Menos dudas. Más tranquilidad.
                  </p>
                </section>
              </div>
            </motion.div>
          ) : null}

          {activeTab === 'owners' ? (
            <motion.div
              key="owners"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <section className="overflow-hidden rounded-[34px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] px-7 py-10 shadow-[0_28px_56px_-40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:px-10 md:py-12">
                <div className="max-w-3xl space-y-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Para anfitriones</p>
                  <div className="space-y-4">
                    <h2 className="max-w-3xl text-[36px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 dark:text-slate-50 md:text-[48px]">
                      Elegí con quién hablar antes de aceptar una reserva.
                    </h2>
                    <p className="max-w-2xl text-[1.05rem] leading-8 text-slate-700 dark:text-slate-300">
                      En esta plataforma no solo publicás. También ves quién te contacta, qué historial tiene y cómo se comporta.
                    </p>
                    <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
                      Publicar es simple y gratis. Mejorar la calidad de las consultas depende de la información que validás.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" onClick={openPublishingFlow}>
                      <Icons.ArrowRight className="h-5 w-5" />
                      Publicar propiedad
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => scrollToSection(hostVerificationRef.current)}>
                      Ver cómo funciona
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="max-w-2xl space-y-2">
                  <p className="app-eyebrow">Diferencial</p>
                  <h3 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50 md:text-[36px]">
                    Qué te ayuda a decidir antes de aceptar
                  </h3>
                </div>

                <div className="grid gap-6 md:grid-cols-3 md:gap-8">
                  {hostDifferentiators.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="space-y-3 border-t border-slate-200/85 pt-4 dark:border-slate-800">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">
                            {item.title}
                          </h4>
                          <p className="text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section
                ref={hostVerificationRef}
                className="scroll-mt-28 overflow-hidden rounded-[34px] border border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.14),transparent_38%),linear-gradient(180deg,rgba(239,246,255,0.9),rgba(255,255,255,0.98))] px-7 py-8 shadow-[0_28px_56px_-40px_rgba(15,23,42,0.18)] dark:border-brand/20 dark:bg-brand/10 md:px-10 md:py-10"
              >
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-start">
                  <div className="space-y-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/12 text-brand shadow-[0_18px_32px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                      <Icons.Verified className="h-6 w-6" />
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/90 dark:text-brand-light/80">Verificación presencial</p>
                      <h3 className="max-w-2xl text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 dark:text-slate-50 md:text-[40px]">
                        La verificación cambia la calidad de las reservas.
                      </h3>
                      <p className="max-w-2xl text-[1.02rem] leading-8 text-slate-700 dark:text-slate-300">
                        Podés publicar sin costo, pero las propiedades con mayor nivel de verificación reciben más visibilidad, consultas más claras y reservas más seguras.
                      </p>
                    </div>

                    <div className="rounded-[26px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)] dark:border-brand/20 dark:bg-slate-950/70 md:p-6">
                      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        {hostVerificationChecklist.map((item) => (
                          <li key={item} className="flex items-center gap-3 text-[0.98rem] font-medium text-slate-800 dark:text-slate-100">
                            <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <Button size="lg" variant="secondary" onClick={() => scrollToSection(hostVideoRef.current)}>
                        Entender cómo funciona la verificación
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[30px] bg-slate-950 px-6 py-7 text-white shadow-[0_32px_62px_-42px_rgba(15,23,42,0.45)] md:px-7 md:py-8 dark:bg-slate-900">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Mayor impacto</p>
                      <p className="text-[1.4rem] font-semibold leading-[1.2] tracking-[-0.03em] text-white md:text-[1.7rem]">
                        Más visibilidad, mejores consultas y menos ruido antes de aceptar.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section ref={hostVideoRef} className="scroll-mt-28 space-y-6">
                <div className="max-w-2xl space-y-2">
                  <p className="app-eyebrow">Próximamente</p>
                  <h3 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50 md:text-[36px]">
                    Cómo lograr la verificación máxima
                  </h3>
                </div>

                <div className="space-y-5 rounded-[30px] border border-dashed border-slate-300/90 bg-white/96 p-5 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900 md:p-7">
                  <div className="aspect-video overflow-hidden rounded-[24px] border border-slate-200/85 bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.1),transparent_46%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94))] dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex h-full items-center justify-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/88 text-brand shadow-[0_18px_32px_-24px_rgba(67,56,202,0.32)] dark:border-slate-700 dark:bg-slate-900 dark:text-brand-light">
                        <Icons.Video className="h-7 w-7" />
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
                    Próximamente: guía paso a paso para publicar con verificación completa y mejorar tu exposición.
                  </p>
                </div>
              </section>
            </motion.div>
          ) : null}

          {activeTab === 'guests' ? (
            <motion.div
              key="guests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <section className="app-card app-card-elevated overflow-hidden border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-8 md:p-10 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-500/12 text-emerald-700 shadow-[0_16px_30px_-24px_rgba(16,185,129,0.34)] dark:bg-emerald-500/12 dark:text-emerald-300">
                    <Icons.ShieldCheck className="h-6 w-6" />
                  </div>
                  <SectionTitle
                    eyebrow="Huéspedes"
                    as="h2"
                    heading="Qué mirar antes de reservar"
                    description="Antes de reservar, podés ver quién publica, dónde está el lugar y qué dijeron otras personas."
                    className="max-w-2xl"
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    {guestBenefits.map((benefit) => (
                      <RoleBenefitCard key={benefit.title} benefit={benefit} />
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start">
                <StepListCard content={guestSteps} />

                <Card padding="none" className="overflow-hidden rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_28px_54px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-6 p-7 md:p-8">
                    <SectionTitle
                      eyebrow="Listo para explorar"
                      as="h3"
                      heading="Explorá sabiendo qué ya fue comprobado"
                      description="No reemplaza una visita ni una charla. Sirve para llegar a esa charla sabiendo qué ya fue comprobado."
                      className="max-w-sm"
                    />

                    <div className="space-y-3">
                      {[
                        'Podés ver quién publica y qué ya se revisó en el aviso.',
                        'Podés comparar ubicación verificada, reseñas reales y fotos en la misma lectura.',
                        'La decisión sigue siendo tuya.',
                      ].map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      fullWidth
                      onClick={() => navigate('/')}
                    >
                      <Icons.ArrowRight className="h-5 w-5" />
                      Explorá propiedades
                    </Button>
                  </div>
                </Card>
              </section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </motion.div>
  );
};

export default AboutPage;