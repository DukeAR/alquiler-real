import React from 'react';
import { motion } from 'motion/react';
import { Icons } from './Icons';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

interface FAQPageProps {
  onBack: () => void;
}

type IconType = React.ComponentType<{ className?: string }>;

type ValidationBucket = {
  eyebrow: string;
  title: string;
  items: string[];
  icon: IconType;
  tone: 'positive' | 'neutral';
};

type SupportCard = {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconType;
  className: string;
  iconWrapClassName: string;
  titleClassName: string;
  descriptionClassName: string;
};

type FAQItem = {
  question: string;
  answer: string;
  bullets?: string[];
  icon: IconType;
};

type FAQGroup = {
  eyebrow: string;
  description: string;
  items: FAQItem[];
};

type RoleGuide = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  icon: IconType;
  tone: 'dark' | 'light';
};

const validationBuckets: ValidationBucket[] = [
  {
    eyebrow: 'Sí mostramos',
    title: 'Qué podés revisar antes de reservar',
    icon: Icons.ShieldCheck,
    tone: 'positive',
    items: [
      'Quién publica, cuando esa identidad quedó confirmada.',
      'Si hay ubicación verificada o si la ubicación coincide con el lugar.',
      'Qué reseñas reales o registro del lugar hay.',
      'Qué parte del aviso ya está clara antes de hablar o pagar.',
    ],
  },
  {
    eyebrow: 'No comprobamos',
    title: 'Qué queda fuera de la app',
    icon: Icons.ShieldAlert,
    tone: 'neutral',
    items: [
      'El estado final del lugar, la limpieza o los servicios.',
      'Aspectos legales, contratos o titularidad.',
      'Cómo va a salir la estadía en todos los casos.',
    ],
  },
];

const supportCards: SupportCard[] = [
  {
    eyebrow: 'Pagos directos',
    title: 'El pago va por fuera de la app',
    description: 'Se coordina entre anfitrión y huésped. Alquiler Real no procesa pagos ni retiene dinero.',
    icon: Icons.FileText,
    className: 'border-slate-200/85 bg-white/98 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900',
    iconWrapClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    titleClassName: 'text-slate-950 dark:text-slate-50',
    descriptionClassName: 'text-slate-600 dark:text-slate-400',
  },
  {
    eyebrow: 'Hoy y lo que viene',
    title: 'Hoy operamos en San Clemente',
    description: 'Ese es el alcance actual. Si más adelante cambia el flujo de pago, lo vamos a mostrar claro. Hoy no forma parte de la app.',
    icon: Icons.MapPin,
    className: 'border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_18px_38px_-30px_rgba(15,23,42,0.18)] dark:border-brand/20 dark:bg-slate-900',
    iconWrapClassName: 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light',
    titleClassName: 'text-slate-950 dark:text-slate-50',
    descriptionClassName: 'text-slate-600 dark:text-slate-400',
  },
];

const faqGroups: FAQGroup[] = [
  {
    eyebrow: 'Antes de reservar',
    description: 'Qué mirar antes de avanzar y qué no conviene dar por hecho.',
    items: [
      {
        question: '¿Qué me aporta ver información comprobada en una propiedad?',
        answer: 'Sirve para saber qué parte del aviso se pudo comprobar antes de hablar o pagar.',
        bullets: [
          'Quién publica, si hay ubicación verificada y si existen reseñas reales o registro del lugar.',
          'No reemplaza una visita, pero evita decidir solo por promesas.',
        ],
        icon: Icons.ShieldCheck,
      },
      {
        question: '¿Eso garantiza cómo va a salir la estadía?',
        answer: 'No. Que algo esté comprobado no significa que la app garantice limpieza, estado del lugar ni funcionamiento de los servicios.',
        icon: Icons.Home,
      },
      {
        question: '¿Qué conviene revisar igual antes de pagar?',
        answer: 'Además de la verificación, conviene revisar lo básico de la publicación.',
        bullets: [
          'Reseñas reales, fotos, ubicación y reglas de la propiedad.',
          'Lo que no esté claro, preguntalo antes de pagar.',
        ],
        icon: Icons.Search,
      },
    ],
  },
  {
    eyebrow: 'Pagos y alcance',
    description: 'Qué hace la app y qué queda por fuera.',
    items: [
      {
        question: '¿Quién maneja el pago?',
        answer: 'El pago lo coordinan anfitrión y huésped. La app no procesa pagos, no retiene plata y no cobra por reservar.',
        icon: Icons.FileSpreadsheet,
      },
      {
        question: '¿Qué pasa si hay un conflicto?',
        answer: 'La app no interviene ni decide quién tiene razón. Si hay un problema, lo resuelven las partes por fuera de la plataforma.',
        icon: Icons.MessageSquare,
      },
    ],
  },
];

const roleGuides: RoleGuide[] = [
  {
    eyebrow: 'Para anfitriones',
    title: 'Mostrá lo importante antes del chat',
    description: 'Si el aviso deja claro quién publica, dónde está el lugar y qué parte se pudo comprobar, la consulta llega mejor.',
    points: [
      'La otra persona entiende más rápido qué ofrecés.',
      'Bajan las preguntas que se resuelven leyendo.',
      'El trato sigue siendo directo y el pago va por fuera de la app.',
    ],
    icon: Icons.Home,
    tone: 'dark',
  },
  {
    eyebrow: 'Para huéspedes',
    title: 'Sabé qué revisar antes de reservar',
    description: 'Podés ver quién publica, si hay ubicación verificada y qué reseñas reales dejaron otras personas.',
    points: [
      'No arrancás solo con fotos y promesas.',
      'Podés comparar propiedades sin ir a ciegas.',
      'La decisión sigue siendo tuya.',
    ],
    icon: Icons.UserCheck,
    tone: 'light',
  },
];

const FAQCard = ({ item }: { item: FAQItem }) => {
  const Icon = item.icon;

  return (
    <Card
      padding="none"
      className="rounded-[28px] border-slate-200/85 bg-white/98 p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 md:p-7"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 space-y-3">
          <h3 className="text-[1.02rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
            {item.question}
          </h3>
          <p className="app-body-sm leading-7 text-slate-600 dark:text-slate-400">
            {item.answer}
          </p>

          {item.bullets ? (
            <ul className="space-y-2 pt-1">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-[0.9rem] leading-6 text-slate-600 dark:text-slate-400">
                  <Icons.Check className="mt-1 h-4 w-4 shrink-0 text-brand" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

const RoleGuideCard = ({ guide }: { guide: RoleGuide }) => {
  const Icon = guide.icon;
  const isDark = guide.tone === 'dark';

  return (
    <Card
      padding="none"
      className={isDark
        ? 'overflow-hidden rounded-[30px] border-slate-900 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98))] text-white shadow-[0_30px_60px_-38px_rgba(15,23,42,0.52)] dark:border-slate-800'
        : 'overflow-hidden rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_28px_54px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900'}
    >
      <div className="space-y-6 p-7 md:p-8">
        <div className="flex items-start gap-4">
          <div className={isDark
            ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/10 text-white'
            : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light'}
          >
            <Icon className="h-6 w-6" />
          </div>

          <div className="space-y-3">
            <p className={isDark ? 'app-eyebrow text-slate-400' : 'app-eyebrow text-brand'}>{guide.eyebrow}</p>
            <h3 className={isDark
              ? 'text-[1.4rem] font-semibold leading-[1.2] tracking-[-0.02em] text-white'
              : 'text-[1.4rem] font-semibold leading-[1.2] tracking-[-0.02em] text-slate-950 dark:text-slate-50'}
            >
              {guide.title}
            </h3>
            <p className={isDark
              ? 'text-[0.95rem] leading-7 text-slate-200/88'
              : 'text-[0.95rem] leading-7 text-slate-600 dark:text-slate-400'}
            >
              {guide.description}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {guide.points.map((point) => (
            <div
              key={point}
              className={isDark
                ? 'flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-100/92'
                : 'flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3.5 text-[0.92rem] leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}
            >
              <Icons.CheckCircle2 className={isDark ? 'mt-0.5 h-4 w-4 shrink-0 text-emerald-300' : 'mt-0.5 h-4 w-4 shrink-0 text-brand'} />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950"
    >
      <PageHeader
        onBack={onBack}
        eyebrow="Ayuda"
        heading="Preguntas frecuentes"
        description="Qué muestra la app, qué no comprobamos y qué conviene revisar antes de reservar o publicar."
        contentClassName="mx-auto w-full max-w-5xl"
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-8 md:gap-14 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <Card
            padding="none"
            variant="elevated"
            className="overflow-hidden border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-7 shadow-[0_30px_62px_-46px_rgba(15,23,42,0.26)] dark:border-slate-800 dark:bg-slate-900 md:p-8"
          >
            <div className="space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.38)] dark:bg-brand/15 dark:text-brand-light">
                <Icons.ShieldCheck className="h-6 w-6" />
              </div>

              <SectionTitle
                eyebrow="Información clara"
                as="h2"
                heading="Qué mostramos y qué no damos por hecho"
                description="Mostramos qué parte del aviso ya fue comprobada y qué queda fuera de la app."
                className="max-w-2xl"
              />

              <div className="grid gap-4 lg:grid-cols-2">
                {validationBuckets.map((bucket) => {
                  const Icon = bucket.icon;
                  const isPositive = bucket.tone === 'positive';

                  return (
                    <Card
                      key={bucket.eyebrow}
                      padding="none"
                      className={isPositive
                        ? 'rounded-[24px] border-emerald-200/80 bg-emerald-50/92 p-5 dark:border-emerald-900/30 dark:bg-emerald-900/20'
                        : 'rounded-[24px] border-slate-200/85 bg-white/88 p-5 dark:border-slate-800 dark:bg-slate-950'}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={isPositive
                            ? 'flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-500 text-white'
                            : 'flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-900 text-white dark:bg-slate-800'}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="space-y-1">
                            <p className={isPositive ? 'app-form-label text-emerald-700 dark:text-emerald-300' : 'app-form-label text-slate-500 dark:text-slate-400'}>
                              {bucket.eyebrow}
                            </p>
                            <h3 className={isPositive
                              ? 'text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-emerald-900 dark:text-emerald-200'
                              : 'text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50'}
                            >
                              {bucket.title}
                            </h3>
                          </div>
                        </div>

                        <ul className="space-y-3">
                          {bucket.items.map((item) => (
                            <li key={item} className={isPositive
                              ? 'flex items-start gap-2.5 text-[0.9rem] leading-6 text-emerald-800/90 dark:text-emerald-200/90'
                              : 'flex items-start gap-2.5 text-[0.9rem] leading-6 text-slate-600 dark:text-slate-400'}
                            >
                              <Icons.Check className={isPositive ? 'mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300' : 'mt-1 h-4 w-4 shrink-0 text-slate-400'} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="grid gap-5">
            {supportCards.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.eyebrow} padding="none" className={`rounded-[26px] p-6 md:p-7 ${item.className}`}>
                  <div className="space-y-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] ${item.iconWrapClassName}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-2.5">
                      <p className="app-form-label text-slate-500 dark:text-slate-400">{item.eyebrow}</p>
                      <h3 className={`text-[1.02rem] font-semibold leading-6 tracking-[-0.015em] ${item.titleClassName}`}>
                        {item.title}
                      </h3>
                      <p className={`app-body-sm leading-7 ${item.descriptionClassName}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="FAQ principal"
            as="h2"
            heading="Preguntas que conviene resolver antes de reservar o publicar"
            description="Respuestas cortas sobre verificación, pagos y alcance."
            className="max-w-3xl"
          />

          <div className="grid gap-8 xl:grid-cols-2">
            {faqGroups.map((group) => (
              <div key={group.eyebrow} className="space-y-4">
                <div className="space-y-2 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                  <p className="app-form-label text-slate-500 dark:text-slate-400">{group.eyebrow}</p>
                  <p className="app-body-sm max-w-prose text-slate-500 dark:text-slate-400">{group.description}</p>
                </div>

                <div className="space-y-4">
                  {group.items.map((item) => (
                    <FAQCard key={item.question} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Para cada rol"
            as="h2"
            heading="Cómo cambia si publicás o reservás"
            description="La misma información sirve para publicar un aviso más claro o para reservar viendo qué ya fue comprobado."
            className="max-w-3xl"
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {roleGuides.map((guide) => (
              <RoleGuideCard key={guide.title} guide={guide} />
            ))}
          </div>
        </section>
      </main>
    </motion.div>
  );
};

export default FAQPage;
