import React from 'react';
import { motion } from 'motion/react';
import { Icons } from './Icons';
import { Card } from './ui/Card';
import { SectionTitle } from './ui/SectionTitle';

interface FAQPageProps {
  onBack: () => void;
}

export const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  const faqs = [
    {
      question: "¿Cuál es el alcance de Alquiler Real?",
      answer: "Alquiler Real es una plataforma informativa que muestra señales sobre la identidad de los anfitriones y la existencia física de las propiedades. No hacemos inspecciones técnicas, pericias ni certificaciones sobre la titularidad legal."
    },
    {
      question: "¿La app garantiza la calidad o limpieza de la propiedad?",
      answer: "No. Alquiler Real no garantiza la calidad, la limpieza, el funcionamiento de los servicios ni toda la experiencia de la estadía. Nuestra validación se limita a confirmar que la propiedad existe y a verificar la identidad del anfitrión en un momento determinado."
    },
    {
      question: "¿Cómo se procesan los pagos?",
      answer: "Alquiler Real no es un intermediario financiero. No procesamos pagos, no retenemos dinero ni cobramos comisiones por reserva. El acuerdo económico y la forma de pago quedan entre las partes."
    },
    {
      question: "¿Qué responsabilidad tiene la plataforma ante un conflicto?",
      answer: "La plataforma funciona como una herramienta para ordenar información y registrar reputación. Si hay conflictos por el estado del inmueble o por incumplimientos, las partes tienen que resolverlo por las vías legales correspondientes. Alquiler Real no asume responsabilidad legal por la conducta de los usuarios."
    },
    {
      question: "¿Dónde está disponible el servicio?",
      answer: "Hoy operamos como MVP en San Clemente del Tuyú. La idea es expandirnos al resto de la Costa Atlántica argentina en próximas etapas."
    },
    {
      question: "¿Habrá sistema de retención de seña en el futuro?",
      answer: "Sí, estamos trabajando en una función de retención de seña para custodiar el depósito hasta que el huésped llegue a la propiedad y dar más tranquilidad en la operación."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20"
    >
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="app-button-base rounded-full p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Icons.ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="app-title-4 dark:text-white">Preguntas frecuentes</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <SectionTitle
          eyebrow="Ayuda"
          heading="Respuestas claras para usar la app con más confianza"
          description="Estas respuestas siguen el criterio de transparencia de la plataforma: qué validamos, qué no y para qué sirve cada señal visible."
          className="space-y-3"
          headingClassName="dark:text-white"
        />

        <section className="space-y-6">
          <Card padding="lg" className="space-y-3 bg-blue-50 border-blue-100 dark:border-blue-800/30 dark:bg-blue-900/20">
            <h2 className="app-title-4 text-blue-900 dark:text-blue-400 flex items-center gap-2">
              <Icons.Shield className="w-5 h-5" />
              Aclaración legal
            </h2>
            <p className="app-body-sm text-blue-800/80 dark:text-blue-300/80">
              Alquiler Real es una herramienta para ordenar información y sumar transparencia. No somos una agencia de viajes, una inmobiliaria ni una entidad financiera. La información publicada es declarativa y se apoya en documentación y material cargado por los usuarios.
            </p>
          </Card>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} padding="lg" className="space-y-3 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="app-title-4 dark:text-white">{faq.question}</h3>
                <p className="app-body-sm app-text-muted dark:text-slate-400">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--app-radius-card)] bg-slate-900 text-white p-8 space-y-4 shadow-[var(--app-shadow-soft)]">
          <p className="app-eyebrow text-slate-400">Para anfitriones</p>
          <h3 className="app-title-4 text-white">¿Sos anfitrión?</h3>
          <p className="app-body-sm text-slate-400">
            La verificación cuida tu reputación y te diferencia de perfiles dudosos. Al validar tu identidad, construís un historial más claro y recibís consultas con más contexto.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 app-eyebrow text-emerald-400">
              <Icons.CheckCircle2 className="w-4 h-4" /> Prevención de reservas fraudulentas
            </div>
            <div className="flex items-center gap-2 app-eyebrow text-emerald-400">
              <Icons.CheckCircle2 className="w-4 h-4" /> Huéspedes con identidad verificada
            </div>
          </div>
        </section>

        <section className="app-card bg-brand/10 border-brand/20 p-8 space-y-4 dark:border-brand/30 dark:bg-brand/10">
          <p className="app-eyebrow text-brand">Para huéspedes</p>
          <h3 className="app-title-4 text-brand">¿Sos huésped?</h3>
          <p className="app-body-sm text-slate-600 dark:text-slate-400">
            Usar Alquiler Real te permite revisar si la propiedad existe y si el anfitrión dio información real. Tomá mejores decisiones mirando el nivel de verificación de cada propiedad.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 app-eyebrow text-brand">
              <Icons.CheckCircle2 className="w-4 h-4" /> Identidad verificada
            </div>
            <div className="flex items-center gap-2 app-eyebrow text-brand">
              <Icons.CheckCircle2 className="w-4 h-4" /> Propiedad con señales verificadas
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );
};
