import { cn } from '../../lib/utils';

type VerificationInfoPanelProps = {
  className?: string;
};

const VERIFICATION_INFO_ITEMS = [
  {
    title: 'Identidad del anfitrión verificada',
    description: 'Durante la visita confirmamos la identidad del anfitrión asociada al aviso.',
  },
  {
    title: 'Acceso real a la propiedad confirmado',
    description: 'La visita confirmó que existe acceso real a la propiedad publicada.',
  },
  {
    title: 'Ubicación validada durante visita',
    description: 'La ubicación quedó validada durante la visita presencial al lugar.',
  },
] as const;

const VERIFICATION_BENEFIT_ITEMS = [
  {
    title: 'Más confianza antes de coordinar',
    description: 'La visita reduce dudas sobre identidad, ubicación y acceso real del aviso.',
  },
  {
    title: 'Mejor prioridad visual dentro del marketplace',
    description: 'Cuando una persona compara opciones, el aviso presencialmente verificado queda mejor respaldado por información real.',
  },
  {
    title: 'Consultas más enfocadas',
    description: 'Con datos clave ya confirmados, la conversación arranca con menos incertidumbre básica.',
  },
] as const;

export const VerificationInfoPanel = ({ className }: VerificationInfoPanelProps) => {
  return (
    <section
      data-testid="verification-info-panel"
      className={cn('rounded-[30px] border border-slate-200/80 bg-white/96 p-6 sm:p-7', className)}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Lo que suma la verificación presencial</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          No hace falta para publicar. Sí sirve para generar más confianza y ganar mejor prioridad visual dentro del marketplace.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Qué confirma</p>
      </div>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {VERIFICATION_INFO_ITEMS.map((item, index) => (
          <div
            key={item.title}
            className="flex gap-3 rounded-[24px] border border-slate-200/70 bg-slate-50/70 px-4 py-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500 ring-1 ring-slate-200/80">
              {index + 1}
            </span>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <p className="text-sm font-semibold text-slate-900">Qué mejora</p>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {VERIFICATION_BENEFIT_ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/70 px-4 py-4"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <div className="space-y-2">
          <p className="text-base font-semibold text-slate-900">La verificación suma confianza, no marketing exagerado.</p>
          <p className="text-sm leading-6 text-slate-600">La visita deja identidad, ubicación y acceso confirmados para que el aviso tenga mejor respaldo antes de decidir.</p>
          <p className="text-sm leading-6 text-slate-600">No evaluamos estado, calidad ni amenities del inmueble.</p>
        </div>
      </div>
    </section>
  );
};

export default VerificationInfoPanel;