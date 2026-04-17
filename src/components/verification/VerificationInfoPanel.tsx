import { cn } from '../../lib/utils';

type VerificationInfoPanelProps = {
  className?: string;
};

const VERIFICATION_INFO_ITEMS = [
  {
    title: 'Anfitrión confirmado',
    description: 'Validamos la identidad de quien publica para asegurar que hay una persona real detrás del aviso.',
  },
  {
    title: 'Ubicación verificada',
    description: 'Confirmamos que la propiedad existe y corresponde a la dirección publicada.',
  },
  {
    title: 'Geolocalización precisa',
    description: 'El punto en el mapa coincide con la ubicación real del inmueble.',
  },
  {
    title: 'Fotos y video reales',
    description: 'El contenido visual muestra el lugar tal como es.',
  },
  {
    title: 'Disponibilidad validada',
    description: 'El anfitrión responde y confirma disponibilidad reciente.',
  },
] as const;

export const VerificationInfoPanel = ({ className }: VerificationInfoPanelProps) => {
  return (
    <section
      data-testid="verification-info-panel"
      className={cn('rounded-[30px] border border-slate-200/80 bg-white/96 p-6 sm:p-7', className)}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Cómo se valida este aviso</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Estas comprobaciones muestran qué información ya fue confirmada y qué falta para decidir con claridad.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Qué cambia esto</p>
        <div className="mt-3 space-y-2">
          <p className="text-base font-semibold text-slate-900">Más comprobaciones = más claridad para decidir</p>
          <p className="text-sm leading-6 text-slate-600">Los avisos más completos aparecen primero</p>
        </div>
      </div>
    </section>
  );
};

export default VerificationInfoPanel;