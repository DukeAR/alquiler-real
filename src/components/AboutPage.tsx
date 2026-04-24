import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
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

const hostBenefits: RoleBenefit[] = [
  {
    title: 'Publicás con más claridad',
    description: 'Tu aviso deja visible quién sos, dónde está el lugar y qué parte ya fue comprobada desde el inicio.',
    icon: Icons.Home,
  },
  {
    title: 'Revisás mejor cada solicitud',
    description: 'Antes de aceptar, sumás contexto del huésped y de cómo viene avanzando la reserva.',
    icon: Icons.ShieldCheck,
  },
  {
    title: 'Aportás referencias útiles',
    description: 'Después de la estadía, podés dejar una opinión útil para otros anfitriones, enfocada en la experiencia real.',
    icon: Icons.MessageSquare,
  },
];

const hostAcceptancePoints = [
  'Si la identidad del huésped ya fue confirmada.',
  'Qué historial de reservas tiene dentro de la plataforma.',
  'Qué reseñas dejaron otros anfitriones después de recibirlo.',
  'Qué tan completo está su perfil para entender si ya cargó la información básica.',
  'Señales objetivas de uso serio dentro de la plataforma.',
];

const hostGuestProfilePoints = [
  'Identidad confirmada, si ya está validada.',
  'Antigüedad en la plataforma.',
  'Reservas completadas.',
  'Cancelaciones o conflictos, si existen.',
  'Reseñas de anfitriones.',
  'Nivel de completitud del perfil.',
];

const hostOperationSignals = [
  'Si consultó antes por la propiedad.',
  'Si la guardó y volvió a verla.',
  'Si completó sus datos básicos.',
  'Si avanzó seriamente en la solicitud.',
];

const hostClosingPoints = [
  'Mostrás mejor tu propiedad desde el inicio.',
  'Entendés mejor quién te quiere alquilar antes de aceptar.',
  'Dejás referencias útiles que ayudan a otros anfitriones a decidir mejor.',
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

const hostSteps: StepCard = {
  eyebrow: 'Para publicar mejor',
  title: 'Qué conviene completar antes de publicar',
  description: 'Cuatro pasos para que el aviso se entienda antes del chat y la reserva arranque mejor.',
  icon: Icons.ListTodo,
  steps: [
    'Confirmá tu identidad.',
    'Marcá bien la ubicación y el precio.',
    'Subí fotos o video que muestren el lugar como es.',
    'Publicá cuando el aviso se entienda sin depender del chat.',
  ],
  tone: 'brand',
};

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
  const [activeTab, setActiveTab] = React.useState<AboutTab>('official');

  const openAuthModal = () => {
    import('../lib/modal').then((modal) => modal.showLoginModal());
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
        contentClassName="w-max translate-y-2"
        headingClassName="mb-0 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-brand/20 bg-brand/10 px-5 py-2.5 text-[1.35rem] font-semibold tracking-[-0.05em] leading-none text-slate-950 shadow-[0_16px_30px_-24px_rgba(67,56,202,0.24)]"
        headingStyle={{ marginBottom: 0, lineHeight: 1, color: 'var(--color-text)', fontSize: '1.5rem' }}
        className="relative mx-auto mb-0 max-w-5xl items-center gap-2 px-6 py-1 md:py-1"
      />

      <main className="mx-auto max-w-5xl px-6 py-3 space-y-4">
        <div className="app-card app-card-muted rounded-[26px] p-1.5 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Información sobre la plataforma">
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
              <div className="mx-auto flex w-full max-w-[940px] flex-col gap-6 md:gap-7">
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

                      <p className="max-w-[620px] text-[0.9rem] leading-relaxed text-slate-600 dark:text-slate-400">
                        De mirar fotos y no saber si son reales.<br />
                        De dudar si la ubicación es la que dicen.<br />
                        De no tener claro quién está del otro lado.
                      </p>

                      <p className="max-w-[620px] text-[0.9rem] leading-relaxed text-slate-600 dark:text-slate-400">
                        Eso le pasa a todo el mundo.<br />
                        Y cuando se trata de vacaciones, no debería ser así.
                      </p>

                      <p className="max-w-[620px] text-[0.9rem] leading-relaxed text-slate-600 dark:text-slate-400">
                        Alquiler Real nace para eso:<br />
                        para que alquilar deje de ser una apuesta.
                      </p>

                      <p className="max-w-[620px] text-[0.9rem] leading-relaxed text-slate-600 dark:text-slate-400">
                        Para que puedas ver qué está realmente comprobado antes de decidir.
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

                      <p className="mt-3 text-[0.9rem] font-semibold leading-6 text-slate-900 dark:text-slate-50">
                        Y te vas tranquilo.
                      </p>
                    </div>
                  </div>
                </section>

                <p className="rounded-full border border-emerald-200/60 bg-emerald-50/70 px-4 py-2 text-[0.88rem] font-medium text-emerald-700 shadow-none dark:border-emerald-900/25 dark:bg-emerald-950/20 dark:text-emerald-300">
                  Por eso, en cada publicación diferenciamos dos cosas:
                </p>

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

                <section className="mx-auto max-w-4xl space-y-4 rounded-[30px] border border-slate-200/85 bg-white/96 p-5 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.16)] md:p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-end justify-center gap-3 text-center">
                    <div className="space-y-1 text-center">
                      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                        <Icons.Lightbulb className="h-5 w-5" />
                      </div>
                      <p className="app-eyebrow">Cierre</p>
                      <h2 className="text-[clamp(1.45rem,2.2vw,1.8rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                        Esto recién empieza
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {futureCards.map((item, index) => (
                      <div key={item.title} className={cn('relative h-full overflow-hidden', item.cardClassName)}>
                        <div className="relative flex h-full flex-col gap-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-[18px]', item.iconWrapperClassName)}>
                              <item.icon className={cn('h-5 w-5', item.iconClassName)} />
                            </div>
                            <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-semibold tracking-[0.18em]', item.badgeClassName)}>
                              0{index + 1}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-[0.95rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
                              {item.title}
                            </h3>
                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
              <section className="app-card app-card-elevated overflow-hidden border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-8 md:p-10 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)]">
                    <Icons.Home className="h-6 w-6" />
                  </div>
                  <SectionTitle
                    eyebrow="Anfitriones"
                    as="h2"
                    heading="No solo publicás mejor. También elegís con más información."
                    description="Antes de aceptar una reserva, podés revisar quién te contacta, qué historial tiene en la plataforma y qué dijeron otros anfitriones. Así decidís con más criterio, sin sumar fricción innecesaria."
                    className="max-w-3xl"
                    descriptionClassName="text-slate-700 dark:text-slate-300"
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    {hostBenefits.map((benefit) => (
                      <RoleBenefitCard key={benefit.title} benefit={benefit} />
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-start">
                <Card padding="none" variant="elevated" className="overflow-hidden rounded-[30px] border-brand/15 bg-brand/[0.06] p-7 shadow-[0_26px_52px_-40px_rgba(15,23,42,0.22)] dark:border-brand/20 dark:bg-brand/10 md:p-8">
                  <div className="space-y-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                      <Icons.ShieldCheck className="h-6 w-6" />
                    </div>

                    <SectionTitle
                      eyebrow="Qué podés revisar antes de aceptar"
                      as="h3"
                      heading="Más contexto para decidir con criterio"
                      description="La idea es que, cuando esa información ya existe dentro de la plataforma, la veas ordenada antes de responder o aceptar."
                      className="max-w-2xl"
                      eyebrowClassName="text-brand/90 dark:text-brand-light/80"
                      descriptionClassName="text-slate-700 dark:text-slate-300"
                    />

                    <div className="space-y-3">
                      {hostAcceptancePoints.map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[18px] border border-brand/10 bg-white/88 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-800 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] dark:border-brand/20 dark:bg-slate-950/70 dark:text-slate-100">
                          <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/78 dark:text-emerald-300/72" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <p className="app-body-sm leading-7 text-slate-700 dark:text-slate-300">
                      No reemplaza tu criterio ni la conversación. Te da una base más clara para decidir con calma.
                    </p>
                  </div>
                </Card>

                <div className="grid gap-6">
                  <Card padding="none" className="rounded-[30px] border-slate-200/85 bg-white/96 p-7 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:p-8">
                    <div className="space-y-6">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-100 text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-slate-100">
                        <Icons.BadgeCheck className="h-6 w-6" />
                      </div>

                      <SectionTitle
                        eyebrow="Ficha breve del huésped"
                        as="h3"
                        heading="Lo importante en una lectura"
                        description="La experiencia está pensada para ordenar la información básica del huésped sin convertirla en un filtro automático."
                        className="max-w-sm"
                        descriptionClassName="text-slate-700 dark:text-slate-300"
                      />

                      <ul className="space-y-3">
                        {hostGuestProfilePoints.map((point) => (
                          <li key={point} className="flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/82 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>

                  <Card padding="none" className="rounded-[28px] border-emerald-200/70 bg-emerald-50/75 p-6 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.16)] dark:border-emerald-900/30 dark:bg-emerald-900/14 md:p-7">
                    <div className="space-y-5">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
                        <Icons.Layers className="h-5 w-5" />
                      </div>

                      <SectionTitle
                        eyebrow="Señales útiles dentro de la operación"
                        as="h3"
                        heading="Qué muestra el recorrido de la solicitud"
                        description="Sin sumar fricción innecesaria, también podés ver señales útiles del recorrido de esa reserva dentro de la plataforma."
                        className="max-w-sm"
                        descriptionClassName="text-emerald-900/80 dark:text-emerald-200/85"
                        headingClassName="text-emerald-950 dark:text-emerald-100"
                        eyebrowClassName="text-emerald-700 dark:text-emerald-300"
                      />

                      <ul className="space-y-3">
                        {hostOperationSignals.map((point) => (
                          <li key={point} className="flex items-start gap-2.5 text-[0.9rem] leading-6 text-emerald-900/85 dark:text-emerald-200/90">
                            <Icons.Check className="mt-1 h-4 w-4 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start">
                <StepListCard content={hostSteps} />

                <Card padding="none" className="overflow-hidden rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_26px_52px_-38px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-6 p-7 md:p-8">
                    <SectionTitle
                      eyebrow="Cierre"
                      as="h3"
                      heading="Publicar mejor también te permite aceptar con más criterio."
                      description="Cuando el aviso está claro y la reserva llega con más contexto, la decisión se ordena mejor para ambos lados."
                      className="max-w-md"
                      eyebrowClassName="text-slate-800 dark:text-slate-100"
                      descriptionClassName="text-slate-800 dark:text-slate-100"
                      headingClassName="text-slate-800 dark:text-slate-100"
                    />

                    <div className="space-y-3">
                      {hostClosingPoints.map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[18px] border border-slate-200/90 bg-white px-4 py-3.5 text-[0.92rem] font-medium leading-6 text-slate-800 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                          <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 rounded-[20px] border border-slate-200/80 bg-white/92 px-4 py-4 text-slate-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                      <p className="app-body-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">
                        Después de cada estadía, también podés dejar una opinión útil para otros anfitriones.
                      </p>
                      <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">
                        La idea es que esa opinión se enfoque en cómo fue la reserva y la estadía, no en juicios personales.
                      </p>
                    </div>

                    <Button size="lg" fullWidth onClick={openAuthModal}>
                      <Icons.ArrowRight className="h-5 w-5" />
                      Creá tu cuenta y publicá
                    </Button>
                  </div>
                </Card>
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