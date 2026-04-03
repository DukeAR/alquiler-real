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

type StepCardTone = 'blue' | 'emerald';

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
    eyebrow: 'Qué sí hacemos',
    title: 'Qué mostramos antes de que decidas',
    description: 'Ejemplos concretos de lo que podés ver antes de hablar o pagar.',
    points: [
      'Quién está detrás de la publicación cuando hay verificación.',
      'Si la ubicación coincide con el lugar real.',
      'Qué dijeron otras personas que ya estuvieron.',
      'Qué información es clara antes de hablar o pagar.',
    ],
    icon: Icons.Target,
    cardClassName: 'rounded-[26px] border-emerald-200/80 bg-emerald-50/92 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/20',
    iconClassName: 'flex h-11 w-11 items-center justify-center rounded-[16px] bg-emerald-500 text-white',
    pointClassName: 'text-emerald-800/90 dark:text-emerald-200/90',
  },
  {
    eyebrow: 'Qué no hacemos',
    title: 'Qué no vas a encontrar acá',
    description: 'Hay cosas que no prometemos ni mostramos como si estuvieran resueltas.',
    points: [
      'No garantizamos el estado del lugar ni los servicios.',
      'No certificamos aspectos legales o contratos.',
      'No intervenimos en pagos ni conflictos.',
    ],
    icon: Icons.ShieldAlert,
    cardClassName: 'rounded-[26px] border-slate-200/85 bg-white/92 p-6 dark:border-slate-800 dark:bg-slate-950',
    iconClassName: 'flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-900 text-white dark:bg-slate-800',
    pointClassName: 'text-slate-600 dark:text-slate-400',
  },
];

const verificationLevels: VerificationLevel[] = [
  {
    title: 'Verificación presencial',
    description: 'Es el nivel más sólido porque hubo validación en el lugar.',
    bullets: [
      'La identidad fue validada en persona.',
      'Se registró el lugar físicamente.',
      'La ubicación coincide con la propiedad.',
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
    description: 'La validación fue online. Sirve para revisar algunos datos antes de avanzar.',
    bullets: [
      'La identidad fue validada online.',
      'Hay señal de ubicación en ese momento.',
      'No reemplaza una visita real.',
    ],
    icon: Icons.Shield,
    cardClassName: 'rounded-[28px] border-blue-200/80 bg-blue-50/92 p-6 dark:border-blue-900/30 dark:bg-blue-900/20 md:p-7',
    iconWrapClassName: 'flex h-12 w-12 items-center justify-center rounded-[18px] bg-blue-500 text-white shadow-[0_18px_34px_-24px_rgba(59,130,246,0.34)]',
    headingClassName: 'text-blue-950 dark:text-blue-200',
    bodyClassName: 'text-blue-800/85 dark:text-blue-200/85',
    pointClassName: 'text-blue-800/90 dark:text-blue-200/90',
  },
];

const futureCards: FutureCard[] = [
  {
    title: 'Más zonas con el mismo criterio',
    description: 'La idea es llevar esta forma de mostrar información a más destinos de la costa.',
    icon: Icons.Globe,
  },
  {
    title: 'Más claridad al reservar',
    description: 'Más adelante puede haber una seña resguardada para ordenar mejor el momento del pago.',
    icon: Icons.Lock,
  },
  {
    title: 'Información cada vez más útil',
    description: 'Queremos sumar datos concretos sin llenar la pantalla de texto ni etiquetas vacías.',
    icon: Icons.Layers,
  },
];

const hostBenefits: RoleBenefit[] = [
  {
    title: 'Menos dudas básicas',
    description: 'Si el aviso explica lo importante, la otra persona ya sabe qué está viendo.',
    icon: Icons.MessageSquare,
  },
  {
    title: 'Aviso más claro',
    description: 'Identidad, ubicación y datos concretos ayudan a entender rápido qué ofrecés.',
    icon: Icons.ShieldCheck,
  },
  {
    title: 'Pago por fuera de la app',
    description: 'El acuerdo y el cobro siguen siendo directos entre vos y el huésped.',
    icon: Icons.FileText,
  },
];

const guestBenefits: RoleBenefit[] = [
  {
    title: 'Quién publica',
    description: 'Si hubo verificación, no hablás con un perfil anónimo.',
    icon: Icons.BadgeCheck,
  },
  {
    title: 'Dónde está el lugar',
    description: 'Podés revisar si la ubicación coincide con la propiedad.',
    icon: Icons.MapPin,
  },
  {
    title: 'Qué dijeron otros',
    description: 'Las reseñas muestran cómo fue la estadía para otras personas.',
    icon: Icons.Search,
  },
];

const hostSteps: StepCard = {
  eyebrow: 'Paso a paso',
  title: 'Qué conviene completar antes de publicar',
  description: 'Un recorrido corto para que el aviso diga algo útil desde el inicio.',
  icon: Icons.ListTodo,
  steps: [
    'Creá tu cuenta como anfitrión.',
    'Cargá dirección, precio, fotos y reglas básicas.',
    'Validá tu identidad y, si corresponde, sumá ubicación o visita presencial.',
    'Publicá cuando la información principal ya esté clara.',
  ],
  tone: 'blue',
};

const guestSteps: StepCard = {
  eyebrow: 'Cómo usarlo',
  title: 'Qué revisar antes de reservar',
  description: 'Un recorrido corto para no decidir solo por fotos o apuro.',
  icon: Icons.ListTodo,
  steps: [
    'Elegí la zona y compará propiedades.',
    'Revisá quién publica, qué verificación tiene y qué reseñas hay.',
    'Hacé preguntas concretas antes de avanzar.',
    'Coordiná el pago cuando ya hayas revisado ubicación, reseñas y reglas básicas.',
  ],
  tone: 'emerald',
};

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
      <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">{benefit.description}</p>
    </Card>
  );
};

const StepListCard = ({ content }: { content: StepCard }) => {
  const Icon = content.icon;
  const isBlue = content.tone === 'blue';

  return (
    <Card
      padding="none"
      className={isBlue
        ? 'rounded-[28px] border-blue-200/80 bg-blue-50/92 p-6 dark:border-blue-900/30 dark:bg-blue-900/20 md:p-7'
        : 'rounded-[28px] border-emerald-200/80 bg-emerald-50/92 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/20 md:p-7'}
    >
      <div className="space-y-5">
        <SectionTitle
          eyebrow={content.eyebrow}
          as="h3"
          heading={
            <span className={cn('flex items-center gap-2', isBlue ? 'text-blue-950 dark:text-blue-200' : 'text-emerald-950 dark:text-emerald-200')}>
              <Icon className="h-5 w-5" />
              {content.title}
            </span>
          }
          description={content.description}
          headingClassName={isBlue ? 'text-blue-950 dark:text-blue-200' : 'text-emerald-950 dark:text-emerald-200'}
        />

        <ol className="space-y-3">
          {content.steps.map((step, index) => (
            <li
              key={step}
              className={isBlue
                ? 'flex gap-3 rounded-[18px] border border-blue-200/70 bg-white/72 p-3.5 dark:border-blue-900/30 dark:bg-slate-950/70'
                : 'flex gap-3 rounded-[18px] border border-emerald-200/70 bg-white/72 p-3.5 dark:border-emerald-900/30 dark:bg-slate-950/70'}
            >
              <span className={isBlue
                ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white'
                : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white'}
              >
                {index + 1}
              </span>
              <span className={cn('app-body-sm leading-6', isBlue ? 'text-blue-900/88 dark:text-blue-200/88' : 'text-emerald-900/88 dark:text-emerald-200/88')}>
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
        eyebrow="Transparencia"
        heading="Cómo funciona Alquiler Real"
        description="Qué información muestra la app, qué cosas se pudieron comprobar y qué conviene mirar antes de reservar."
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
                      heading="Información clara para elegir sin adivinar"
                      description="Alquilar en la costa muchas veces depende de confiar en lo que alguien publica. Fotos, descripciones y promesas."
                      className="max-w-2xl"
                    />
                    <div className="space-y-4">
                      <p className="app-body text-slate-700 dark:text-slate-300">
                        Acá ordenamos lo que se puede comprobar antes de avanzar: <strong>quién publica, si el lugar coincide y qué experiencia tuvieron otros.</strong>
                      </p>
                      <p className="app-body text-slate-700 dark:text-slate-300">
                        No reemplazamos tu criterio. Mostramos datos concretos para que decidas con más base.
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
                  heading="Qué significa que algo esté verificado"
                  description="No todo es igual. Algunas cosas se pudieron comprobar, otras no."
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
                      <h3 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">Qué mirar además de esto</h3>
                      <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">
                        La verificación ayuda, pero no alcanza sola. Siempre conviene revisar reseñas, fotos, ubicación y hablar con quien publica antes de reservar.
                      </p>
                    </div>
                  </div>
                </Card>
              </section>

              <section className="space-y-6 border-t border-slate-200 pt-8 dark:border-slate-800">
                <SectionTitle
                  eyebrow="Próximo paso"
                  as="h2"
                  heading="Lo que seguimos sumando"
                  description="Queremos sumar más zonas y seguir mostrando solo lo importante antes de reservar."
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
                    heading="Publicá con información que se pueda revisar"
                    description="Si el aviso deja claro quién publica, dónde está el lugar y qué parte fue validada, la otra persona entiende mejor qué está viendo."
                    className="max-w-2xl"
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    {hostBenefits.map((benefit) => (
                      <RoleBenefitCard key={benefit.title} benefit={benefit} />
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start">
                <StepListCard content={hostSteps} />

                <Card padding="none" className="overflow-hidden rounded-[30px] border-slate-900 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98))] text-white shadow-[0_30px_60px_-38px_rgba(15,23,42,0.52)] dark:border-slate-800">
                  <div className="space-y-6 p-7 md:p-8">
                    <SectionTitle
                      eyebrow="Siguiente paso"
                      as="h3"
                      heading="Publicá con lo importante resuelto"
                      description="Antes de recibir consultas, dejá claro quién publica, dónde está el lugar y qué parte del aviso ya fue validada."
                      className="max-w-sm"
                      headingClassName="text-white"
                    />

                    <div className="space-y-3">
                      {[
                        'La otra persona entiende mejor el aviso.',
                        'Bajan las preguntas que se resuelven leyendo.',
                        'El trato sigue siendo directo.',
                      ].map((point) => (
                        <div key={point} className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-100/92">
                          <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <Button size="lg" fullWidth onClick={openAuthModal} className="bg-white text-slate-950 shadow-[0_18px_36px_-28px_rgba(255,255,255,0.32)] hover:bg-slate-100 hover:text-slate-950">
                      <Icons.ArrowRight className="h-5 w-5" />
                      Creá tu cuenta de anfitrión
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
                    heading="Mirá qué se pudo comprobar"
                    description="Antes de reservar, podés revisar quién publica, si la ubicación coincide y qué dijeron otras personas."
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
                      heading="Explorá con la información a la vista"
                      description="No reemplaza una visita ni una charla. Sirve para llegar a esa charla sabiendo qué se pudo comprobar y qué no."
                      className="max-w-sm"
                    />

                    <div className="space-y-3">
                      {[
                        'Podés ver quién publica y qué parte del aviso fue validada.',
                        'Podés comparar ubicación, reseñas y fotos en la misma lectura.',
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