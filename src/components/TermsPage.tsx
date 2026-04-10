import React from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { PlatformTermsQuickGuide } from './ui/PlatformTermsQuickGuide';
import { SectionTitle } from './ui/SectionTitle';
import { PLATFORM_TERMS_CLAUSES, PLATFORM_TERMS_INTRO } from '../lib/platformTerms';

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
        <PlatformTermsQuickGuide
          eyebrow="Lectura rápida"
          title="Lo esencial en 1 minuto"
          description="Arrancá por este resumen corto si querés entender rápido qué hace Alquiler Real, cuándo te protege y cuándo no."
        />

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
      </main>
    </motion.div>
  );
};

export default TermsPage;