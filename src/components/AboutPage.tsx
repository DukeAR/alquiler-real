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
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  icon: IconType;
  cardClassName: string;
  iconClassName: string;
  pointClassName: string;
};

type VerificationLevel = {
  title: string;
  description: string;
  bullets: string[];
  icon: IconType;
  cardClassName: string;
  iconWrapClassName: string;
  headingClassName: string;
  bodyClassName: string;
  pointClassName: string;
};

type FutureCard = {
  title: string;
  description: string;
  icon: IconType;
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

const projectScopeCards: ScopeCard[] = [
  {
    eyebrow: 'Qué te mostramos',
    title: 'Lo que podés revisar antes de reservar',
    description: 'Lo primero que conviene mirar en un aviso antes de hablar o reservar.',
    points: [
      'Quién publica cuando la identidad ya fue confirmada.',
      'Si la ubicación coincide con el lugar.',
      'Si hay fotos o video que muestren el estado real.',
      'Qué reseñas dejaron otras personas que ya estuvieron.',
    ],
    icon: Icons.Target,
    cardClassName: 'rounded-[26px] border-brand/15 bg-brand/[0.06] p-6 dark:border-brand/20 dark:bg-brand/10',
    iconClassName: 'flex h-11 w-11 items-center justify-center rounded-[16px] bg-brand text-white',
    pointClassName: 'text-slate-700 dark:text-slate-200',
  },
  {
    eyebrow: 'Qué revisar igual',
    title: 'Lo básico que sigue importando',
    description: 'Además de lo verificado, mirá lo esencial del aviso antes de avanzar.',
    points: [
      'Fotos, precio y reglas básicas del lugar.',
      'Reseñas completas si ya hay estadías cerradas.',
      'Las dudas concretas que quieras resolver antes de coordinar.',
    ],
    icon: Icons.Search,
    cardClassName: 'rounded-[26px] border-slate-200/85 bg-white/92 p-6 dark:border-slate-800 dark:bg-slate-950',
    iconClassName: 'flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-900 text-white dark:bg-slate-800',
    pointClassName: 'text-slate-600 dark:text-slate-400',
  },
];

const verificationLevels: VerificationLevel[] = [
  {
    title: 'Verificación presencial',
    description: 'Ya hubo una revisión en el lugar.',
    bullets: [
      'Quién publica quedó confirmado.',
      'La ubicación coincide con el lugar.',
      'Hay revisión hecha en persona.',
    ],
    icon: Icons.ShieldCheck,
    cardClassName: 'rounded-[28px] border-emerald-200/80 bg-emerald-50/92 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/20 md:p-7',
    iconWrapClassName: 'flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-500 text-white shadow-[0_18px_34px_-24px_rgba(16,185,129,0.38)]',
    headingClassName: 'text-emerald-950 dark:text-emerald-200',
    bodyClassName: 'text-emerald-800/85 dark:text-emerald-200/85',
    pointClassName: 'text-emerald-800/90 dark:text-emerald-200/90',
  },
  {
    title: 'Verificación digital',
    description: 'Hay una revisión online y material cargado por quien publica.',
    bullets: [
      'La identidad quedó confirmada online.',
      'Hay material real para mirar.',
      'Todavía no reemplaza una visita al lugar.',
    ],
    icon: Icons.Shield,
    cardClassName: 'rounded-[28px] border-brand/15 bg-brand/[0.06] p-6 dark:border-brand/20 dark:bg-brand/10 md:p-7',
    iconWrapClassName: 'flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand text-white shadow-[0_18px_34px_-24px_rgba(67,56,202,0.34)]',
    headingClassName: 'text-slate-950 dark:text-slate-50',
    bodyClassName: 'text-slate-700 dark:text-slate-300',
    pointClassName: 'text-slate-700 dark:text-slate-200',
  },
];

const futureCards: FutureCard[] = [
  {
    title: 'Más avisos que se entiendan rápido',
    description: 'Queremos que cada vez más propiedades se puedan leer y evaluar sin vueltas.',
    icon: Icons.Globe,
  },
  {
    title: 'Más verificaciones visibles',
    description: 'Si algo ya se comprobó, queremos que se vea rápido y sin rodeos.',
    icon: Icons.Shield,
  },
  {
    title: 'Menos vueltas para decidir',
    description: 'La idea es que entiendas el aviso en segundos y llegues mejor a la conversación.',
    icon: Icons.Layers,
  },
];

const hostBenefits: RoleBenefit[] = [
  {
    title: 'Quién sos queda claro',
    description: 'Si tu identidad está confirmada, la otra persona lo ve antes de escribirte.',
    icon: Icons.BadgeCheck,
  },
  {
    title: 'Se entiende mejor el lugar',
    description: 'La ubicación y el material real ayudan a que no todo dependa del chat.',
    icon: Icons.ShieldCheck,
  },
  {
    title: 'Llegan consultas más útiles',
    description: 'Te escriben con menos dudas básicas y con más decisión.',
    icon: Icons.MessageSquare,
  },
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
  eyebrow: 'Antes de publicar',
  title: 'Qué conviene completar antes de publicar',
  description: 'Cuatro pasos para que el aviso se entienda antes del chat.',
  icon: Icons.ListTodo,
  steps: [
    'Confirmá tu identidad.',
    'Marcá bien la ubicación y el precio.',
    'Subí fotos o video que muestren el lugar como es.',
    'Publicá cuando el aviso se entienda sin abrir el chat.',
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

const hostHighValidationPoints = [
  'Se ve quién publica.',
  'Se entiende dónde está el lugar.',
  'Hay material real para mirar antes de escribir.',
];

const hostScopePoints = [
  'Nombre, ubicación y material real dejan de ser dudas iniciales.',
  'La otra persona entiende más rápido si el lugar le cierra.',
  'La conversación empieza más ordenada y con menos vueltas.',
];

const ScopeCardBlock = ({ card }: { card: ScopeCard }) => {
  const Icon = card.icon;

  return (
    <Card padding="none" className={card.cardClassName}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={card.iconClassName}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <p className="app-form-label text-slate-500 dark:text-slate-400">{card.eyebrow}</p>
            <h3 className="text-[1.02rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
              {card.title}
            </h3>
          </div>
        </div>

        <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">{card.description}</p>

        <ul className="space-y-3">
          {card.points.map((point) => (
            <li key={point} className={cn('flex items-start gap-2.5 text-[0.9rem] leading-6', card.pointClassName)}>
              <Icons.Check className="mt-1 h-4 w-4 shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};

const VerificationLevelCard = ({ level }: { level: VerificationLevel }) => {
  const Icon = level.icon;

  return (
    <Card padding="none" className={level.cardClassName}>
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className={level.iconWrapClassName}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <h3 className={cn('text-[1.12rem] font-semibold leading-6 tracking-[-0.02em]', level.headingClassName)}>
              {level.title}
            </h3>
            <p className={cn('app-body-sm leading-7', level.bodyClassName)}>
              {level.description}
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {level.bullets.map((bullet) => (
            <li key={bullet} className={cn('flex items-start gap-2.5 text-[0.9rem] leading-6', level.pointClassName)}>
              <Icons.Check className="mt-1 h-4 w-4 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};

const RoleBenefitCard = ({ benefit }: { benefit: RoleBenefit }) => {
  const Icon = benefit.icon;

  return (
    <Card padding="lg" className={aboutFeatureCardClass}>
      <Icon className="h-6 w-6 text-brand" />
      <h3 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">{benefit.title}</h3>
      <p className="app-body-sm leading-7 text-slate-700 dark:text-slate-300">{benefit.description}</p>
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
      <div className="space-y-5">
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

        <ol className="space-y-3">
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
        eyebrow="Antes de reservar"
        heading="Sabé qué estás viendo antes de reservar"
        description="Qué muestra la app, qué parte del aviso ya fue comprobada y qué conviene revisar antes de reservar."
        contentClassName="mx-auto w-full max-w-5xl"
      />

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-10 md:space-y-12">
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
              className="space-y-10"
            >
              <section className="space-y-5">
                <SectionTitle
                  as="h2"
                  heading="Por qué existe Alquiler Real"
                  className="max-w-3xl"
                />

                <div className="max-w-3xl space-y-4">
                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    Alquiler Real nace de algo simple: la frustración de no saber en qué confiar.
                  </p>

                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    Fotos que no representan el lugar, ubicaciones poco claras, condiciones que cambian después de hablar… y muchas veces, directamente, estafas.
                  </p>

                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    Reservar es cada vez más fácil.<br />
                    Pero decidir bien sigue siendo difícil.
                  </p>

                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    Este proyecto no busca reemplazar tu decisión, sino mejorarla.
                  </p>

                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    Mostramos información que normalmente no está clara desde el inicio:<br />
                    quién publica, dónde está realmente el lugar y qué parte del aviso fue comprobada.
                  </p>

                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    No intervenimos en el acuerdo ni en el pago.<br />
                    Pero sí en algo clave: que tengas contexto real antes de avanzar.
                  </p>

                  <p className="app-body leading-8 text-slate-700 dark:text-slate-300">
                    Porque elegir bien no debería depender de la suerte.
                  </p>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                <Card
                  padding="none"
                  variant="elevated"
                  className="overflow-hidden border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-7 shadow-[0_30px_62px_-46px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-900 md:p-8"
                >
                  <div className="space-y-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.36)] dark:bg-brand/15 dark:text-brand-light">
                      <Icons.Target className="h-6 w-6" />
                    </div>
                    <SectionTitle
                      eyebrow="Proyecto"
                      as="h2"
                      heading="Lo importante para revisar antes de reservar"
                      description="Quién publica, dónde está el lugar, cómo se ve y qué dijeron otras personas, todo en la misma lectura."
                      className="max-w-2xl"
                    />
                    <div className="space-y-4">
                      <p className="app-body text-slate-700 dark:text-slate-300">
                        Mostramos <strong>identidad confirmada, ubicación verificada, material real y reseñas</strong> cuando esa información está disponible.
                      </p>
                      <p className="app-body text-slate-700 dark:text-slate-300">
                        La idea es que sepas qué estás viendo antes de escribir o reservar.
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="grid gap-5">
                  {projectScopeCards.map((card) => (
                    <ScopeCardBlock key={card.title} card={card} />
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <SectionTitle
                  eyebrow="Cómo leer una propiedad"
                  as="h2"
                  heading="Qué puede aparecer como verificado"
                  description="Cada aviso dice qué ya se comprobó y qué todavía falta."
                />

                <div className="grid gap-5 lg:grid-cols-2">
                  {verificationLevels.map((level) => (
                    <VerificationLevelCard key={level.title} level={level} />
                  ))}
                </div>

                <Card padding="none" className="rounded-[24px] border-slate-200/85 bg-white/96 p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900 md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Icons.Info className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">Qué revisar además</h3>
                      <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">
                        También conviene mirar fotos, precio, reglas y reseñas antes de avanzar.
                      </p>
                    </div>
                  </div>
                </Card>
              </section>

              <section className="space-y-6 border-t border-slate-200 pt-8 dark:border-slate-800">
                <SectionTitle
                  eyebrow="Próximo paso"
                  as="h2"
                  heading="En qué seguimos trabajando"
                  description="Queremos que cada aviso se entienda rápido, sin promesas vacías ni relleno."
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {futureCards.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Card key={item.title} padding="lg" className={cn(aboutFeatureCardClass, 'app-card-muted')}>
                        <Icon className="h-6 w-6 text-brand" />
                        <h3 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">{item.title}</h3>
                        <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">{item.description}</p>
                      </Card>
                    );
                  })}
                </div>
              </section>
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
                    heading="Publicá para que te entiendan antes del chat"
                    description="Antes de recibir consultas, dejá claro quién sos, dónde está el lugar y qué parte del aviso ya fue comprobada."
                    className="max-w-2xl"
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
                      eyebrow="Cuando el aviso ya está claro"
                      as="h3"
                      heading="Cuanto más completo esté tu aviso, más arriba aparece"
                      description="Además, la otra persona puede ver quién sos, dónde está el lugar y cómo se ve antes de escribirte."
                      className="max-w-2xl"
                      eyebrowClassName="text-brand/90 dark:text-brand-light/80"
                      descriptionClassName="text-slate-700 dark:text-slate-300"
                    />

                    <div className="space-y-3">
                      {hostHighValidationPoints.map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[18px] border border-brand/10 bg-white/88 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-800 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] dark:border-brand/20 dark:bg-slate-950/70 dark:text-slate-100">
                          <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/78 dark:text-emerald-300/72" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <p className="app-body-sm leading-7 text-slate-700 dark:text-slate-300">
                      Un aviso claro no reemplaza la conversación, pero hace que la charla arranque mucho mejor.
                    </p>
                  </div>
                </Card>

                <Card padding="none" className="rounded-[30px] border-slate-200/85 bg-white/96 p-7 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:p-8">
                  <div className="space-y-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-100 text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] dark:bg-slate-800 dark:text-slate-100">
                      <Icons.Layers className="h-6 w-6" />
                    </div>

                    <SectionTitle
                      eyebrow="Qué hace subir un aviso"
                      as="h3"
                      heading="Mostrá lo importante desde el inicio"
                      description="No se trata de agregar texto. Se trata de dejar a la vista lo que hoy define una reserva."
                      className="max-w-sm"
                      descriptionClassName="text-slate-700 dark:text-slate-300"
                    />

                    <ul className="space-y-3">
                      {hostScopePoints.map((point) => (
                        <li key={point} className="flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/82 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start">
                <StepListCard content={hostSteps} />

                <Card padding="none" className="overflow-hidden rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_26px_52px_-38px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-6 p-7 md:p-8">
                    <SectionTitle
                      eyebrow="Siguiente paso"
                      as="h3"
                      heading="Publicá cuando el aviso se entienda solo"
                      description="Cuanto más completo esté tu aviso, más arriba aparece y más concretas llegan las consultas."
                      className="max-w-sm"
                      eyebrowClassName="text-slate-800 dark:text-slate-100"
                      descriptionClassName="text-slate-800 dark:text-slate-100"
                      headingClassName="text-slate-800 dark:text-slate-100"
                    />

                    <div className="space-y-3">
                      {[
                        'La otra persona entiende rápido qué está viendo.',
                        'Llegan preguntas más concretas.',
                        'Tu aviso gana jerarquía sin sobrecargarse.',
                      ].map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[18px] border border-slate-200/90 bg-white px-4 py-3.5 text-[0.92rem] font-medium leading-6 text-slate-800 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                          <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          <span>{point}</span>
                        </div>
                      ))}
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