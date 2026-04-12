import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Card } from './ui/Card';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';
import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_QUICK_GUIDE_INTRO,
  PRIVACY_POLICY_QUICK_GUIDE_SECTIONS,
  PRIVACY_POLICY_SECTIONS,
} from '../lib/privacyPolicy';

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950"
    >
      <PageHeader
        onBack={onBack}
        eyebrow="Privacidad"
        heading="Política de privacidad y datos"
        description="Qué información puede recibir Alquiler Real, para qué se usa y qué parte queda privada dentro del producto."
        action={(
          <Link
            to="/terms"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            Ver términos
          </Link>
        )}
        contentClassName="mx-auto w-full max-w-5xl"
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-8 md:gap-14 md:py-10">
        <section className="space-y-6">
          <SectionTitle
            eyebrow="Lo importante en 1 minuto"
            as="h2"
            heading="Resumen rápido de privacidad"
            description={PRIVACY_POLICY_QUICK_GUIDE_INTRO}
            className="max-w-3xl"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PRIVACY_POLICY_QUICK_GUIDE_SECTIONS.map((section) => (
              <Card
                key={section.id}
                padding="none"
                className="rounded-[26px] border-slate-200/85 bg-white/98 p-5 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="space-y-2.5">
                  <h3 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
                    {section.title}
                  </h3>
                  <p className="text-[0.95rem] leading-7 text-slate-600 dark:text-slate-300">{section.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="Detalle"
            as="h2"
            heading="Uso de datos, documentos y material sensible"
            description={PRIVACY_POLICY_INTRO}
            className="max-w-3xl"
          />

          <div className="grid gap-5 md:grid-cols-2">
            {PRIVACY_POLICY_SECTIONS.map((section) => (
              <Card
                key={section.id}
                padding="none"
                className="rounded-[28px] border-slate-200/85 bg-white/98 p-6 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 md:p-7"
              >
                <div className="space-y-3">
                  <p className="app-form-label text-slate-500 dark:text-slate-400">{section.eyebrow}</p>
                  <h3 className="text-[1.08rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
                    {section.title}
                  </h3>
                  <p className="text-[0.95rem] leading-7 text-slate-600 dark:text-slate-400">
                    {section.body}
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

export default PrivacyPage;