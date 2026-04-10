import React from 'react';
import { motion } from 'motion/react';
import { Icons } from './Icons';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';
import { PLATFORM_TERMS_CLAUSES, PLATFORM_TERMS_HIGHLIGHTS, PLATFORM_TERMS_INTRO } from '../lib/platformTerms';

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
        description="Qué responsabilidad asume cada anfitrión, qué hace Alquiler Real y en qué casos la plataforma no interviene."
        contentClassName="mx-auto w-full max-w-5xl"
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-8 md:gap-14 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <Card
            padding="none"
            variant="elevated"
            className="overflow-hidden border-slate-200/85 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-7 shadow-[0_30px_62px_-46px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-900 md:p-8"
          >
            <div className="space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand/10 text-brand shadow-[0_16px_30px_-24px_rgba(67,56,202,0.38)] dark:bg-brand/15 dark:text-brand-light">
                <Icons.FileText className="h-6 w-6" />
              </div>

              <SectionTitle
                eyebrow="Lectura corta"
                as="h2"
                heading="Qué cubren estos términos dentro de la app"
                description={PLATFORM_TERMS_INTRO}
                className="max-w-2xl"
              />

              <ul className="grid gap-3 sm:grid-cols-2">
                {PLATFORM_TERMS_HIGHLIGHTS.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5 rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-3.5 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card
            padding="none"
            className="overflow-hidden rounded-[28px] border-brand/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98))] p-7 text-white shadow-[0_30px_58px_-40px_rgba(15,23,42,0.48)] dark:border-slate-800 md:p-8"
          >
            <div className="space-y-4">
              <p className="app-eyebrow text-slate-400">Uso responsable</p>
              <h2 className="text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
                La plataforma ordena información y estados, pero no reemplaza tu revisión.
              </h2>
              <p className="text-[0.95rem] leading-7 text-slate-200/88">
                Antes de reservar o pagar, conviene revisar quién publica, los datos de la operación, el modelo de seña y las condiciones que quedaron por escrito.
              </p>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Alcance"
            as="h2"
            heading="Responsabilidades, acuerdos y uso de la plataforma"
            description="Texto claro para entender qué corresponde al anfitrión, qué registra Alquiler Real y qué no puede resolver la app por sí sola."
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
      </main>
    </motion.div>
  );
};

export default TermsPage;