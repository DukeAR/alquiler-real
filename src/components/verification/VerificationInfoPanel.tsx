import { cn } from '../../lib/utils';
import { buildOnsiteVerificationProtocol } from '../../lib/onsiteVerificationProtocol';

type VerificationInfoPanelProps = {
  className?: string;
};

const ONSITE_PROTOCOL = buildOnsiteVerificationProtocol();

export const VerificationInfoPanel = ({ className }: VerificationInfoPanelProps) => {
  return (
    <section
      data-testid="verification-info-panel"
      className={cn('rounded-[30px] border border-slate-200/80 bg-white/96 p-6 sm:p-7', className)}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Protocolo base de verificación presencial</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Usamos una validación operativa, escalable y legalmente consistente para dejar claro qué verifica la plataforma, qué evidencia mínima se registra y cuándo corresponde reverificar.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Qué verificamos</p>
      </div>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {ONSITE_PROTOCOL.scopeItems.map((item, index) => (
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
        <p className="text-sm font-semibold text-slate-900">Qué no verificamos</p>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {ONSITE_PROTOCOL.excludedItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-4 py-4"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <p className="text-sm font-semibold text-slate-900">Evidencia mínima</p>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {ONSITE_PROTOCOL.minimumEvidence.map((item) => (
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
        <p className="text-sm font-semibold text-slate-900">Estados operativos</p>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
          {ONSITE_PROTOCOL.statusOptions.map((item) => (
            <div key={item.key} className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
            <p className="text-base font-semibold text-slate-900">Vigencia recomendada</p>
            <p className="text-sm leading-6 text-slate-600">{ONSITE_PROTOCOL.recommendedValidityMonths} meses. Después corresponde marcar {ONSITE_PROTOCOL.reverificationLabel.toLowerCase()}.</p>
          </div>
          <div className="space-y-2 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
            <p className="text-base font-semibold text-slate-900">Copy visible</p>
            <p className="text-sm leading-6 text-slate-600">Usamos “{ONSITE_PROTOCOL.preferredCopy}” solo cuando la revisión queda aprobada.</p>
          </div>
          <div className="space-y-2 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
            <p className="text-base font-semibold text-slate-900">Términos que evitamos</p>
            <p className="text-sm leading-6 text-slate-600">No usamos {ONSITE_PROTOCOL.avoidedTerms.map((term) => `“${term}”`).join(', ')}.</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-base font-semibold text-slate-900">Enfoque del protocolo</p>
          <p className="text-sm leading-6 text-slate-600">{ONSITE_PROTOCOL.summary}</p>
          <p className="text-sm leading-6 text-slate-600">{ONSITE_PROTOCOL.exclusionsSummary}</p>
          <p className="text-sm leading-6 text-slate-600">Principios: {ONSITE_PROTOCOL.operatingPrinciples.join(' · ')}.</p>
        </div>
      </div>
    </section>
  );
};

export default VerificationInfoPanel;