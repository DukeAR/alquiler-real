import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Icons } from './Icons';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { PlatformTermsQuickGuide } from './ui/PlatformTermsQuickGuide';
import { SectionTitle } from './ui/SectionTitle';
import {
  PLATFORM_OPERATION_SCOPES,
  PLATFORM_PROPERTY_DISCLAIMER,
  PLATFORM_TERMS_CLAUSES,
  PLATFORM_TERMS_HIGHLIGHTS,
  PLATFORM_TERMS_INTRO,
} from '../lib/platformTerms';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950"
    >
      <PageHeader
        onBack={onBack}
        eyebrow="Términos"
        heading="Términos y condiciones"
        description="Qué hace Alquiler Real, qué sigue siendo responsabilidad del anfitrión y cómo cambia el alcance de la plataforma según si la seña y el acuerdo quedan dentro o fuera de la app."
        action={(
          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Icons.Lock className="h-4 w-4" />
            </span>
            Ver privacidad
          </Link>
        )}
        contentClassName="mx-auto w-full max-w-5xl"
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-8 md:gap-14 md:py-10">
        <PlatformTermsQuickGuide
          eyebrow="Lectura rápida"
          title="Lo esencial en 1 minuto"
          description="Arrancá por este resumen corto si querés entender rápido quién publica, qué deja registrado Alquiler Real y cuándo la app puede revisar un caso."
        />

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Puntos clave"
            as="h2"
            heading="Lo que conviene tener claro antes de reservar o publicar"
            description="Resumen corto del rol real de la plataforma y de las responsabilidades que siguen siendo de cada anfitrión."
            className="max-w-3xl"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PLATFORM_TERMS_HIGHLIGHTS.map((item) => (
              <Card
                key={item}
                padding="none"
                className="rounded-[26px] border-slate-200/85 bg-white/98 p-5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light">
                    <span>•</span>
                  </div>
                  <p className="text-[0.95rem] leading-7 text-slate-600 dark:text-slate-300">{item}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Dentro vs fuera"
            as="h2"
            heading="Qué cambia según dónde se haga la seña"
            description="La diferencia importante no es solo el canal: cambia también qué puede registrar la app y hasta dónde puede ayudar la plataforma."
            className="max-w-3xl"
          />

          <div className="grid gap-5 lg:grid-cols-2">
            {PLATFORM_OPERATION_SCOPES.map((scope) => (
              <Card
                key={scope.id}
                padding="none"
                className={scope.tone === 'brand'
                  ? 'rounded-[30px] border-brand/15 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-6 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.18)] dark:border-brand/20 dark:bg-slate-900'
                  : 'rounded-[30px] border-slate-200/85 bg-white/98 p-6 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900'}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className={scope.tone === 'brand' ? 'app-form-label text-brand' : 'app-form-label text-slate-500 dark:text-slate-400'}>{scope.eyebrow}</p>
                    <h3 className="text-[1.08rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
                      {scope.title}
                    </h3>
                  </div>

                  <ul className="space-y-3">
                    {scope.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 text-[0.95rem] leading-7 text-slate-600 dark:text-slate-300">
                        <span className={scope.tone === 'brand' ? 'mt-2 h-2 w-2 shrink-0 rounded-full bg-brand' : 'mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-400'} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Detalle"
            as="h2"
            heading="Responsabilidades, acuerdos y uso de la plataforma"
            description={PLATFORM_TERMS_INTRO}
            className="max-w-3xl"
          />

          <div className="grid gap-5 md:grid-cols-2">
            {PLATFORM_TERMS_CLAUSES.map((clause) => (
              <Card
                key={clause.id}
                padding="none"
                className="rounded-[28px] border-slate-200/85 bg-white/98 p-6 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:p-7"
              >
                <div className="space-y-3">
                  <p className="app-form-label text-slate-500 dark:text-slate-400">{clause.eyebrow}</p>
                  <h3 className="text-[1.08rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
                    {clause.title}
                  </h3>
                  <p className="text-[0.95rem] leading-7 text-slate-600 dark:text-slate-400">
                    {clause.body}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card
          padding="none"
          className="rounded-[30px] border-slate-200/85 bg-white/98 p-6 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="space-y-4">
            <p className="app-form-label text-slate-500 dark:text-slate-400">Lectura práctica</p>
            <h2 className="text-[1.1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
              Cómo leer una verificación sin sobreentenderla
            </h2>
            <p className="text-[0.95rem] leading-7 text-slate-600 dark:text-slate-300">{PLATFORM_PROPERTY_DISCLAIMER}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Ver política de privacidad y datos
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </motion.div>
  );
};

export default TermsPage;