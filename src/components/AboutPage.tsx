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
import { VerificationBadgePremium } from './ui/VerificationBadgePremium';

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

type RoleBenefit = {
  title: string;
  description: string;
  icon: IconType;
};

type GuestVerificationLevel = {
  title: string;
  description: string;
  tone: 'none' | 'identity' | 'presencial';
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
    title: 'Qué podés revisar en un aviso',
    points: [
      'Quién publica',
      'Si hubo verificación presencial',
      'Fotos del lugar',
      'Datos básicos del aviso',
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
    description: 'La visita confirma identidad del anfitrión, acceso real, vínculo con el lugar y ubicación durante la visita.',
    icon: Icons.Home,
    cardClassName: 'rounded-[24px] border border-brand/15 bg-brand/[0.06] p-5 shadow-[0_16px_34px_-28px_rgba(67,56,202,0.14)] dark:border-brand/20 dark:bg-brand/10',
    accentClassName: 'hidden',
    iconClassName: 'text-brand dark:text-brand-light',
    iconWrapperClassName: 'bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light',
  },
  {
    title: 'Información publicada por el anfitrión',
    description: 'El aviso muestra datos cargados por quien publica, sin checks presenciales.',
    icon: Icons.Search,
    cardClassName: 'rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900',
    accentClassName: 'hidden',
    iconClassName: 'text-slate-500 dark:text-slate-300',
    iconWrapperClassName: 'bg-slate-100 text-slate-700 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-slate-100',
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
  'Identidad del anfitrión verificada',
  'Acceso real a la propiedad confirmado',
  'Vínculo comprobable con el lugar',
  'Ubicación validada durante visita',
];

const guestBenefits: RoleBenefit[] = [
  {
    title: 'Quién publica',
    description: 'Si un aviso tiene verificación presencial, sabés quién acreditó su identidad durante la visita.',
    icon: Icons.BadgeCheck,
  },
  {
    title: 'Dónde está el lugar',
    description: 'Si hubo visita presencial, la ubicación quedó validada en el lugar.',
    icon: Icons.MapPin,
  },
  {
    title: 'Qué dijeron otros',
    description: 'Las reseñas reales muestran cómo fue la estadía para otras personas.',
    icon: Icons.Search,
  },
];

const guestVerificationLevels: GuestVerificationLevel[] = [
  {
    title: 'Sin validación',
    description: 'Información cargada por el anfitrión.',
    tone: 'none',
  },
  {
    title: 'Identidad validada',
    description: 'El anfitrión confirmó su identidad.',
    tone: 'identity',
  },
  {
    title: 'Verificado presencialmente',
    description: 'Identidad, ubicación y acceso confirmados durante una visita.',
    tone: 'presencial',
  },
];

const guestSteps: StepCard = {
  eyebrow: 'Cómo usarlo',
  title: 'Qué revisar antes de reservar',
  description: 'Un recorrido corto para no decidir solo por fotos o apuro.',
  icon: Icons.ListTodo,
  steps: [
    'Elegí la zona y compará propiedades.',
    'Revisá si el aviso tiene verificación presencial, quién publica y qué reseñas reales tiene.',
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

const GuestVerificationLevelCard = ({ level }: { level: GuestVerificationLevel }) => {
  if (level.tone === 'presencial') {
    return (
      <div className="rounded-[24px] border border-emerald-200/85 bg-emerald-50/95 p-5 shadow-[0_18px_34px_-28px_rgba(16,185,129,0.24)] dark:border-emerald-900/30 dark:bg-emerald-900/16">
        <div className="space-y-2.5">
          <VerificationBadgePremium size="sm" className="self-start" />
          <h4 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-emerald-600 dark:text-emerald-300">
            {level.title}
          </h4>
          <p className="text-[0.94rem] leading-6 text-emerald-800 dark:text-emerald-100">
            {level.description}
          </p>
        </div>
      </div>
    );
  }

  if (level.tone === 'identity') {
    return (
      <div className="rounded-[24px] border border-slate-200/85 bg-white/98 p-5 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Icons.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <h4 className="text-[1.02rem] font-semibold tracking-[-0.02em]">
              {level.title}
            </h4>
          </div>
          <p className="text-[0.94rem] leading-6 text-slate-600 dark:text-slate-400">
            {level.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-slate-200/85 bg-slate-50/82 p-5 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-2.5">
        <h4 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-slate-500 dark:text-slate-300">
          {level.title}
        </h4>
        <p className="text-[0.94rem] leading-6 text-slate-500 dark:text-slate-400">
          {level.description}
        </p>
      </div>
    </div>
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
                : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50 text-xs font-semibold text-emerald-700 shadow-[0_14px_28px_-20px_rgba(16,185,129,0.18)] dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'}
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

  const openOnsiteVerificationInfo = () => {
    navigate('/verificacion-presencial');
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
                <section className="relative overflow-hidden rounded-[30px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-6 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.16)] md:p-10 dark:border-slate-800 dark:bg-slate-900">
                  <div className="absolute inset-0 hidden" />

                  <div className="relative flex flex-col gap-5">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                      <Icons.Layers className="h-6 w-6" />
                    </div>

                    <div className="w-full space-y-3 text-left">
                      <h1 className="w-full text-[clamp(2rem,3.6vw,2.5rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-slate-900 dark:text-slate-50">
                        ¿Te pasó de reservar un alquiler y no estar del todo tranquilo?
                      </h1>

                      <p className="mb-[10px] w-full text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        Mirás fotos sin saber si son actuales. Dudás si la ubicación es realmente esa. Y muchas veces no tenés claro quién está del otro lado.
                      </p>

                      <p className="mb-[10px] w-full text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        Eso le pasa a todo el mundo. Y cuando se trata de vacaciones, no debería ser así.
                      </p>

                      <div className="my-[12px] flex w-full justify-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-[#ECFDF5] px-[16px] py-[7px] text-center text-[14px] font-semibold text-[#166534]">
                          No es un problema de opciones. Es un problema de confianza.
                        </span>
                      </div>

                      <p className="mb-[10px] w-full text-[0.9rem] leading-[1.7] text-[#5B6470]">
                        Alquiler Real nace para cambiar eso: para que puedas ver, desde el principio, qué parte del aviso tiene respaldo real y qué parte sigue siendo información publicada por el anfitrión.
                      </p>

                      <p className="mt-[6px] mb-[10px] w-full text-[0.9rem] font-semibold leading-[1.7] text-[#111827]">
                        Para que decidir no dependa de adivinar.
                      </p>

                      <p className="mt-[16px] mb-[10px] w-full text-[20px] font-bold leading-[1.7] text-[#163329]">
                        Menos incertidumbre. Más claridad.
                      </p>
                    </div>

                    <div className="mt-2 grid w-full grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                      <div className="flex min-h-[72px] w-full items-center justify-center gap-2.5 rounded-full border border-emerald-200/85 bg-emerald-50/95 px-4 py-3 text-center shadow-[0_20px_34px_-28px_rgba(16,185,129,0.16)] dark:border-emerald-900/35 dark:bg-emerald-900/18">
                        <span className="text-[0.72rem] font-semibold tracking-[0.16em] text-emerald-600/80 dark:text-emerald-200/75">01</span>
                        <span className="text-[1rem] font-semibold text-emerald-800 dark:text-emerald-50">Elegís.</span>
                      </div>
                      <div className="flex min-h-[72px] w-full items-center justify-center gap-2.5 rounded-full border border-emerald-200/85 bg-emerald-50/95 px-4 py-3 text-center shadow-[0_20px_34px_-28px_rgba(16,185,129,0.16)] dark:border-emerald-900/35 dark:bg-emerald-900/18">
                        <span className="text-[0.72rem] font-semibold tracking-[0.16em] text-emerald-600/80 dark:text-emerald-200/75">02</span>
                        <span className="text-[1rem] font-semibold text-emerald-800 dark:text-emerald-50">Hablás.</span>
                      </div>
                      <div className="flex min-h-[72px] w-full items-center justify-center gap-2.5 rounded-full border border-emerald-200/85 bg-emerald-50/95 px-4 py-3 text-center shadow-[0_20px_34px_-28px_rgba(16,185,129,0.16)] dark:border-emerald-900/35 dark:bg-emerald-900/18">
                        <span className="text-[0.72rem] font-semibold tracking-[0.16em] text-emerald-600/80 dark:text-emerald-200/75">03</span>
                        <span className="text-[1rem] font-semibold text-emerald-800 dark:text-emerald-50">Chequeás.</span>
                      </div>
                      <div className="flex min-h-[72px] w-full items-center justify-center gap-2.5 rounded-full border border-emerald-200/85 bg-emerald-50/95 px-4 py-3 text-center shadow-[0_20px_34px_-28px_rgba(16,185,129,0.16)] dark:border-emerald-900/35 dark:bg-emerald-900/18">
                        <span className="text-[0.72rem] font-semibold tracking-[0.16em] text-emerald-600/80 dark:text-emerald-200/75">04</span>
                        <span className="text-[1rem] font-semibold text-emerald-800 dark:text-emerald-50">Reservás.</span>
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
                        Qué significa cada nivel de respaldo
                      </h2>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2 md:items-stretch">
                    {verificationLevels.map((level) => (
                      <VerificationLevelCard key={level.title} level={level} />
                    ))}
                  </div>

                  <p className={projectCardBodyClass}>
                    Aunque un aviso tenga verificación presencial, hay cosas que siguen siendo decisión tuya: precio, reglas y experiencias de otros.
                  </p>
                </section>

                <section className="relative overflow-hidden rounded-[34px] border border-slate-200/85 bg-[radial-gradient(circle_at_top,rgba(67,56,202,0.08),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] px-7 py-10 shadow-[0_28px_56px_-40px_rgba(15,23,42,0.18)] md:px-10 md:py-12 dark:border-slate-800 dark:bg-slate-900">
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent dark:via-brand/20" />
                  <div className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-slate-700/70" />
                  <div className="pointer-events-none absolute -right-12 top-6 h-28 w-28 rounded-full bg-brand/10 blur-3xl dark:bg-brand/15" />
                  <div className="pointer-events-none absolute -left-10 bottom-4 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/10" />

                  <div className="relative mx-auto max-w-3xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-300" />
                      En resumen
                    </div>

                    <h2 className="mt-6 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 dark:text-slate-50">
                      Alquilar debería ser simple.
                    </h2>

                    <div className="mt-5 space-y-4">
                      <p className="text-[1.02rem] leading-8 text-slate-600 dark:text-slate-300 md:text-[1.08rem]">
                        No debería ser una apuesta. No deberías tener que dudar de cada foto, de cada ubicación o de cada persona con la que hablás.
                      </p>

                      <p className="text-[1.02rem] leading-8 text-slate-600 dark:text-slate-300 md:text-[1.08rem]">
                        Alquiler Real existe para eso: para que puedas elegir con información clara, hablar con más confianza y reservar sabiendo mejor dónde te estás metiendo.
                      </p>
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-[0.88rem] font-semibold leading-none md:text-[0.95rem]">
                      <span className="rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-slate-600 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/65 dark:text-slate-300">
                        Más claridad
                      </span>
                      <span className="rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-slate-600 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/65 dark:text-slate-300">
                        Más contexto
                      </span>
                      <span className="rounded-full border border-emerald-200/85 bg-emerald-50/95 px-4 py-2 text-emerald-800 shadow-[0_18px_30px_-26px_rgba(16,185,129,0.18)] dark:border-emerald-900/35 dark:bg-emerald-900/18 dark:text-emerald-100">
                        Menos dudas
                      </span>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-4 text-center">
                      <span className="hidden h-px w-16 bg-gradient-to-r from-transparent to-slate-300/80 md:block dark:to-slate-700/80" />
                      <p className="text-[1.18rem] font-semibold leading-[1.4] tracking-[-0.03em] text-[#163329] dark:text-emerald-100 md:text-[1.42rem]">
                        Menos dudas. Más tranquilidad.
                      </p>
                      <span className="hidden h-px w-16 bg-gradient-to-l from-transparent to-slate-300/80 md:block dark:to-slate-700/80" />
                    </div>
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
              <section className="overflow-hidden rounded-[34px] border border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] px-7 py-10 shadow-[0_28px_56px_-40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:px-10 md:py-12">
                <div className="space-y-8">
                  <div className="w-full space-y-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Para anfitriones</p>
                    <div className="space-y-4">
                      <h2 className="w-full text-[36px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 dark:text-slate-50 md:text-[48px]">
                        Elegí con quién hablar antes de aceptar una reserva.
                      </h2>
                      <p className="w-full text-[1.05rem] leading-8 text-slate-700 dark:text-slate-300">
                        En esta plataforma no solo publicás. También ves quién te contacta, qué historial tiene y cómo se comporta.
                      </p>
                      <p className="w-full text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
                        Publicar es simple y gratis. Mejorar la calidad de las consultas depende de la información que validás.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-4 py-2 sm:flex-row sm:gap-6">
                    <Button size="lg" onClick={openPublishingFlow}>
                      <Icons.ArrowRight className="h-5 w-5" />
                      Publicar propiedad
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => scrollToSection(hostVerificationRef.current)}>
                      Ver cómo funciona
                    </Button>
                  </div>

                  <div className="rounded-[30px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.82),rgba(255,255,255,0.94))] p-5 shadow-[0_20px_40px_-32px_rgba(16,185,129,0.16)] dark:border-emerald-900/30 dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(15,23,42,0.82))] md:p-7">
                    <div className="space-y-6">
                      <div className="mx-auto max-w-2xl space-y-2 text-center">
                        <p className="app-eyebrow">Diferencial</p>
                        <h3 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50 md:text-[36px]">
                          Qué te ayuda a decidir antes de aceptar
                        </h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
                        {hostDifferentiators.map((item) => {
                          const Icon = item.icon;

                          return (
                            <div
                              key={item.title}
                              className="rounded-[24px] border border-emerald-100/80 bg-white/82 p-5 shadow-[0_16px_30px_-26px_rgba(16,185,129,0.12)] dark:border-emerald-900/25 dark:bg-slate-900/88"
                            >
                              <div className="space-y-3">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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
                      <h3 className="w-full text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 dark:text-slate-50 md:text-[40px]">
                        La verificación reduce dudas antes de reservar.
                      </h3>
                      <p className="w-full text-[1.02rem] leading-8 text-slate-700 dark:text-slate-300">
                        Confirmamos que la propiedad existe y que hay una persona identificada con acceso al lugar.
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

                    <p className="text-[0.94rem] leading-7 text-slate-500 dark:text-slate-400">
                      No evaluamos estado ni calidad del inmueble.
                    </p>

                  </div>

                  <div className="space-y-6 lg:pt-[4.5rem]">
                    <div className="min-h-[196px] rounded-[32px] border border-brand/18 bg-[linear-gradient(160deg,rgba(2,6,23,0.96),rgba(49,46,129,0.94)_64%,rgba(5,150,105,0.26))] px-7 py-8 text-white shadow-[0_32px_62px_-42px_rgba(67,56,202,0.36)] ring-1 ring-white/10 md:min-h-[226px] md:px-9 md:py-10 dark:border-brand/22">
                      <div className="space-y-5">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-brand-light/80">Mayor impacto</p>
                        <p className="max-w-[16ch] text-[1.55rem] font-semibold leading-[1.16] tracking-[-0.03em] text-white md:text-[1.95rem]">
                          Más visibilidad, mejores consultas y menos dudas antes de aceptar.
                        </p>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      fullWidth
                      onClick={openOnsiteVerificationInfo}
                      className="mt-3 h-[3.7rem] self-start rounded-[20px] border border-white/20 bg-[linear-gradient(135deg,rgba(79,70,229,1),rgba(99,102,241,1)_58%,rgba(16,185,129,0.94))] px-7 text-[1.02rem] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(67,56,202,0.52),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-brand/12 hover:bg-[linear-gradient(135deg,rgba(67,56,202,1),rgba(79,70,229,1)_58%,rgba(5,150,105,0.96))] hover:text-white hover:shadow-[0_22px_42px_-18px_rgba(67,56,202,0.58),inset_0_1px_0_rgba(255,255,255,0.18)] sm:px-8 md:mt-4 md:h-[3.85rem] md:w-auto"
                    >
                      <Icons.ArrowRight className="h-5 w-5" />
                      Entender cómo funciona la verificación
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
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

              <section className="app-card app-card-elevated overflow-hidden border-slate-200/85 bg-white/98 p-6 md:p-7 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="max-w-2xl space-y-2">
                    <h3 className="text-[1.5rem] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-slate-50 md:text-[1.8rem]">
                      Niveles de verificación
                    </h3>
                    <p className="text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
                      No todos los avisos tienen el mismo nivel de respaldo.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {guestVerificationLevels.map((level) => (
                      <GuestVerificationLevelCard key={level.title} level={level} />
                    ))}
                  </div>

                  <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                    *No evaluamos estado ni calidad del inmueble*
                  </p>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start">
                <StepListCard content={guestSteps} />

                <Card padding="none" className="overflow-hidden rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_28px_54px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-6 p-7 md:p-8">
                    <SectionTitle
                      eyebrow="Listo para explorar"
                      as="h3"
                      heading="Explorá sabiendo qué ya fue confirmado"
                      description="No reemplaza una visita ni una charla. Sirve para llegar a esa charla sabiendo qué quedó confirmado."
                      className="max-w-sm"
                    />

                    <div className="space-y-3">
                      {[
                        'Podés ver quién publica y si el aviso tiene verificación presencial.',
                        'Podés comparar qué quedó confirmado durante la visita, quién publica y qué reseñas reales tiene.',
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