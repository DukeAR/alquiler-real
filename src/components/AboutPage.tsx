import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
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

const aboutTabs: Array<{ id: AboutTab; label: string }> = [
  { id: 'official', label: 'Proyecto' },
  { id: 'owners', label: 'Anfitriones' },
  { id: 'guests', label: 'Huéspedes' },
];

const aboutTabButtonClass = 'app-button-base h-11 flex-1 rounded-[calc(var(--app-radius-control)-4px)] px-4 text-sm font-semibold';
const aboutFeatureCardClass = 'space-y-3 dark:border-slate-800 dark:bg-slate-900';

export const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
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
        heading="Qué es Alquiler Real"
        description="Cómo funciona la plataforma, qué validamos y por qué esas señales ayudan a decidir mejor sin agregar ruido."
        contentClassName="mx-auto w-full max-w-3xl"
      />

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <div className="app-card app-card-muted p-1.5 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="Información sobre la plataforma">
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
                    ? 'bg-white text-brand shadow-[var(--app-shadow-subtle)] dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-50',
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
              className="space-y-8"
            >
              <section className="app-card app-card-elevated p-8 md:p-10 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-control)] bg-brand/10 text-brand">
                    <Icons.Target className="h-6 w-6" />
                  </div>
                  <SectionTitle
                    eyebrow="Proyecto"
                    as="h2"
                    heading="Nuestra misión"
                    description="Reducir estafas en los alquileres temporarios de la Costa Atlántica argentina con señales concretas, comprensibles y útiles para decidir mejor."
                    className="space-y-3"
                  />
                  <div className="space-y-4">
                    <p className="app-body dark:text-slate-400">
                      Alquiler Real nació con una idea simple: <strong>reducir las estafas en los alquileres temporarios de la Costa Atlántica argentina.</strong>
                    </p>
                    <p className="app-body dark:text-slate-400">
                      Sabemos que reservar para las vacaciones debería ser más simple. Por eso armamos una plataforma que no se queda solo en conectar personas: <strong>junta y ordena información real</strong> sobre cada propiedad y la <strong>identidad verificada</strong> de cada anfitrión.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <SectionTitle
                  eyebrow="Criterio"
                  as="h2"
                  heading="Niveles de verificación"
                  description="En Alquiler Real juntamos señales concretas para que decidas mejor. No hacemos inspecciones técnicas ni certificaciones de titularidad."
                />

                <div className="grid gap-6">
                  <Card padding="lg" variant="elevated" className="space-y-4 border-emerald-100 bg-emerald-50/90 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-control)] bg-emerald-500 text-white shadow-[var(--app-shadow-soft)]">
                        <Icons.ShieldCheck className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="app-title-4 text-emerald-900 dark:text-emerald-300">Nivel más alto de verificación</h3>
                        <p className="app-body-sm text-emerald-800/80 dark:text-emerald-300/80">
                          El anfitrión pasó por una <strong>validación presencial</strong> y dejó registro de su identidad y del lugar.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[var(--app-radius-control)] border border-emerald-200/70 bg-white/70 p-4 dark:border-emerald-700/40 dark:bg-slate-900/60">
                      <p className="app-form-label text-emerald-700 dark:text-emerald-400">Qué implica este nivel</p>
                      <ul className="mt-3 space-y-3">
                        <li className="flex items-start gap-3 app-body-sm text-emerald-800/80 dark:text-emerald-300/80">
                          <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" />
                          <span><strong>Identidad:</strong> la identidad del anfitrión se confirmó en persona con DNI o validación facial.</span>
                        </li>
                        <li className="flex items-start gap-3 app-body-sm text-emerald-800/80 dark:text-emerald-300/80">
                          <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" />
                          <span><strong>Existencia:</strong> quedó registro visual de la propiedad en el lugar.</span>
                        </li>
                        <li className="flex items-start gap-3 app-body-sm text-emerald-800/80 dark:text-emerald-300/80">
                          <Icons.Navigation className="mt-0.5 h-4 w-4 shrink-0" />
                          <span><strong>Ubicación:</strong> la ubicación se confirmó en el momento de la visita.</span>
                        </li>
                      </ul>
                    </div>
                  </Card>

                  <Card padding="lg" className="space-y-4 border-blue-100 bg-blue-50/90 dark:border-blue-800/40 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-control)] bg-blue-500 text-white shadow-[var(--app-shadow-soft)]">
                        <Icons.Shield className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="app-title-4 text-blue-900 dark:text-blue-300">Verificación avanzada</h3>
                        <p className="app-body-sm text-blue-800/80 dark:text-blue-300/80">
                          El anfitrión validó su identidad digitalmente y sumó una confirmación de ubicación en tiempo real.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </section>

              <section className="space-y-6 border-t border-slate-200 pt-8 dark:border-slate-800">
                <SectionTitle
                  eyebrow="Próximo paso"
                  as="h2"
                  heading="Lo que viene"
                  description="Seguimos sumando señales para bajar el anonimato y ayudarte a decidir mejor en más destinos."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Card padding="lg" className={cn(aboutFeatureCardClass, 'app-card-muted')}>
                    <Icons.Globe className="h-6 w-6 text-brand" />
                    <h3 className="app-title-4 dark:text-slate-50">Expansión regional</h3>
                    <p className="app-body-sm app-text-muted dark:text-slate-400">Más destinos turísticos con el mismo foco en información real y confianza.</p>
                  </Card>
                  <Card padding="lg" className={cn(aboutFeatureCardClass, 'app-card-muted')}>
                    <Icons.Layers className="h-6 w-6 text-brand" />
                    <h3 className="app-title-4 dark:text-slate-50">Nuevas señales</h3>
                    <p className="app-body-sm app-text-muted dark:text-slate-400">Más cruces útiles para sumar contexto sin agregar ruido.</p>
                  </Card>
                  <Card padding="lg" className={cn(aboutFeatureCardClass, 'app-card-muted')}>
                    <Icons.Zap className="h-6 w-6 text-brand" />
                    <h3 className="app-title-4 dark:text-slate-50">Señales inteligentes</h3>
                    <p className="app-body-sm app-text-muted dark:text-slate-400">Patrones de reputación e historial para ayudarte a comparar mejor.</p>
                  </Card>
                  <Card padding="lg" className={cn(aboutFeatureCardClass, 'app-card-muted')}>
                    <Icons.Shield className="h-6 w-6 text-brand" />
                    <h3 className="app-title-4 dark:text-slate-50">Sin intermediación</h3>
                    <p className="app-body-sm app-text-muted dark:text-slate-400">No retenemos plata ni nos metemos en los acuerdos entre las partes.</p>
                  </Card>
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
              className="space-y-8"
            >
              <section className="app-card app-card-elevated p-8 md:p-10 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-control)] bg-brand/10 text-brand">
                    <Icons.Home className="h-6 w-6" />
                  </div>
                  <SectionTitle
                    eyebrow="Anfitriones"
                    as="h2"
                    heading="Tu propiedad, con información real"
                    description="En un mercado lleno de perfiles dudosos, la confianza hace la diferencia. Mostrar señales claras reduce fricción y mejora la calidad de las consultas."
                    className="space-y-3"
                  />

                  <div className="grid gap-4">
                    <Card padding="lg" className={aboutFeatureCardClass}>
                      <div className="flex items-start gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-[var(--app-shadow-brand)]">1</span>
                        <div className="space-y-2">
                          <h3 className="app-title-4 dark:text-slate-50">Más visibilidad desde el inicio</h3>
                          <p className="app-body-sm app-text-muted dark:text-slate-400">Las propiedades verificadas suelen recibir más consultas y generar menos dudas.</p>
                        </div>
                      </div>
                    </Card>

                    <Card padding="lg" className={aboutFeatureCardClass}>
                      <div className="flex items-start gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-[var(--app-shadow-brand)]">2</span>
                        <div className="space-y-2">
                          <h3 className="app-title-4 dark:text-slate-50">Sin comisiones por reservar</h3>
                          <p className="app-body-sm app-text-muted dark:text-slate-400">El trato es directo entre vos y el huésped. No retenemos tu dinero.</p>
                        </div>
                      </div>
                    </Card>

                    <Card padding="lg" className={aboutFeatureCardClass}>
                      <div className="flex items-start gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-[var(--app-shadow-brand)]">3</span>
                        <div className="space-y-2">
                          <h3 className="app-title-4 dark:text-slate-50">Verificación en el lugar</h3>
                          <p className="app-body-sm app-text-muted dark:text-slate-400">Si querés, nuestro equipo puede visitar tu propiedad y dejar un registro visual del lugar.</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </section>

              <section>
                <Card padding="lg" className="space-y-5 border-blue-100 bg-blue-50/90 dark:border-blue-800/40 dark:bg-blue-900/20">
                  <SectionTitle
                    eyebrow="Paso a paso"
                    as="h3"
                    heading={
                      <span className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                        <Icons.ListTodo className="h-5 w-5" />
                        Cómo publicar tu propiedad
                      </span>
                    }
                    description="Un flujo corto, directo y entendible para sumar señales de confianza sin burocracia innecesaria."
                    headingClassName="text-blue-900 dark:text-blue-300"
                  />

                  <ol className="space-y-3">
                    {[
                      'Creá una cuenta como anfitrión.',
                      'Cargá los datos de tu propiedad: título, dirección, precio y fotos.',
                      'Verificá tu identidad con DNI y selfie.',
                      'Pedí validación de ubicación o una visita presencial.',
                      'Tu propiedad queda publicada con señales de confianza.',
                    ].map((step, index) => (
                      <li key={step} className="flex gap-3 rounded-[var(--app-radius-control)] bg-white/70 p-3 dark:bg-slate-900/60">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="app-body-sm text-blue-900/80 dark:text-blue-300/80">{step}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </section>

              <section>
                <Card padding="lg" className="space-y-5 bg-slate-900 text-white shadow-[var(--app-shadow-soft)] dark:border-slate-800 dark:bg-slate-950">
                  <SectionTitle
                    eyebrow="Siguiente paso"
                    as="h3"
                    heading="¿Cómo seguís?"
                    description="Verificá tu identidad, subí fotos reales y sumá la validación de ubicación."
                    className="space-y-3"
                    headingClassName="text-white"
                  />
                  <Button size="lg" fullWidth onClick={openAuthModal}>
                    <Icons.ArrowRight className="h-5 w-5" />
                    Publicá tu propiedad
                  </Button>
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
              className="space-y-8"
            >
              <section className="app-card app-card-elevated p-8 md:p-10 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-control)] bg-brand/10 text-brand">
                    <Icons.ShieldCheck className="h-6 w-6" />
                  </div>
                  <SectionTitle
                    eyebrow="Huéspedes"
                    as="h2"
                    heading="Reservá con menos dudas"
                    description="No arriesgues una seña por una casa que no existe. Acá ves información real antes de avanzar."
                    className="space-y-3"
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card padding="lg" className={aboutFeatureCardClass}>
                      <Icons.CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <h3 className="app-title-4 dark:text-slate-50">Validación de identidad</h3>
                      <p className="app-body-sm app-text-muted dark:text-slate-400">Verificamos identidad contra Renaper para que sepas con quién hablás.</p>
                    </Card>
                    <Card padding="lg" className={aboutFeatureCardClass}>
                      <Icons.Navigation className="h-6 w-6 text-emerald-500" />
                      <h3 className="app-title-4 dark:text-slate-50">Ubicación confirmada</h3>
                      <p className="app-body-sm app-text-muted dark:text-slate-400">Tomamos la ubicación al validar para sumar una señal concreta del lugar.</p>
                    </Card>
                    <Card padding="lg" className={aboutFeatureCardClass}>
                      <Icons.MapPin className="h-6 w-6 text-emerald-500" />
                      <h3 className="app-title-4 dark:text-slate-50">Registro visual del lugar</h3>
                      <p className="app-body-sm app-text-muted dark:text-slate-400">Mostramos fotos o video validados para que decidas con más contexto.</p>
                    </Card>
                  </div>
                </div>
              </section>

              <section>
                <Card padding="lg" className="space-y-5 border-emerald-100 bg-emerald-50/90 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                  <SectionTitle
                    eyebrow="Paso a paso"
                    as="h3"
                    heading={
                      <span className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                        <Icons.ListTodo className="h-5 w-5" />
                        Cómo reservar con más confianza
                      </span>
                    }
                    description="Usá el nivel de verificación como contexto para filtrar mejor y conversar con más criterio antes de pagar."
                    headingClassName="text-emerald-900 dark:text-emerald-300"
                  />

                  <ol className="space-y-3">
                    {[
                      'Creá una cuenta como huésped.',
                      'Buscá propiedades por zona, fecha y cantidad de huéspedes.',
                      'Revisá el nivel de validación de cada propiedad.',
                      'Hablá directo con el anfitrión por chat.',
                      'Coordiná el pago con más información y menos dudas.',
                    ].map((step, index) => (
                      <li key={step} className="flex gap-3 rounded-[var(--app-radius-control)] bg-white/70 p-3 dark:bg-slate-900/60">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="app-body-sm text-emerald-900/80 dark:text-emerald-300/80">{step}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </section>

              <section>
                <Card padding="lg" className="space-y-5 border-brand/25 bg-brand text-white shadow-[var(--app-shadow-brand)] dark:border-brand/30 dark:bg-brand">
                  <SectionTitle
                    eyebrow="Listo para explorar"
                    as="h3"
                    heading="Tu descanso arranca acá"
                    description="Explorá propiedades verificadas y reservá con más confianza."
                    className="space-y-3 text-center"
                    headingClassName="text-white"
                  />
                  <Button
                    size="lg"
                    fullWidth
                    onClick={openAuthModal}
                    className="bg-white text-brand shadow-[var(--app-shadow-soft)] hover:bg-slate-100 hover:text-brand"
                  >
                    Explorá propiedades
                  </Button>
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