import React, { useEffect, useId, useState } from 'react';
import { formatCurrency } from '../lib/utils';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { NoticeBanner } from './ui/NoticeBanner';
import { SectionTitle } from './ui/SectionTitle';
import { formatBookingDateOnly, formatBookingDateTime, getCancellationDeadlineFromStartDate } from '../lib/bookingDates';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  nightly: number;
  total: number;
  confirmLoading?: boolean;
  submitNotice?: {
    tone: React.ComponentProps<typeof NoticeBanner>['tone'];
    heading: string;
    description: string;
  } | null;
}

const formatDate = (iso: string) => {
  return formatBookingDateOnly(iso);
};

const formatGuestSummary = (adults: number, children: number) => {
  const adultsLabel = `${adults} ${adults === 1 ? 'adulto' : 'adultos'}`;
  const childrenLabel = children > 0 ? `${children} ${children === 1 ? 'menor' : 'menores'}` : 'Solo adultos';

  return `${adultsLabel} • ${childrenLabel}`;
};

const BookingConfirmationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  propertyTitle,
  checkIn,
  checkOut,
  nights,
  adults,
  children,
  nightly,
  total,
  confirmLoading = false,
  submitNotice = null,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const cancellationDeadlineLabel = formatBookingDateTime(getCancellationDeadlineFromStartDate(checkIn));

  const activeNotice = submitNotice ?? {
    tone: 'info' as const,
    heading: 'Revisá todo antes de confirmar',
    description: cancellationDeadlineLabel
      ? `Las fechas, la cantidad de huéspedes y el total ya reflejan tu selección actual. Si confirmás ahora, vas a poder cancelarla desde la app hasta el ${cancellationDeadlineLabel}.`
      : 'Las fechas, la cantidad de huéspedes y el total ya reflejan tu selección actual. Después vas a poder cancelar solo hasta 24 horas antes del ingreso.',
  };

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), 180);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!visible || confirmLoading) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, confirmLoading, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          if (!confirmLoading) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      <Card
        padding="none"
        variant="elevated"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border-slate-200/80 bg-white shadow-[0_36px_100px_-60px_rgba(15,23,42,0.5)] transition-all duration-200 ease-out ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'}`}
      >
        <div className="relative overflow-hidden border-b border-slate-200/70 px-6 py-6 sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.14),transparent_34%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand" size="md" className="gap-2">
                  <Icons.Calendar className="h-3.5 w-3.5" />
                  <span>Reserva lista para confirmar</span>
                </Badge>
                <Badge variant="neutral" size="md" className="gap-2">
                  <Icons.Clock className="h-3.5 w-3.5" />
                  <span>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                </Badge>
              </div>

              <SectionTitle
                as="h3"
                visualLevel="h3"
                heading="Confirmá tu reserva"
                description="Revisá fechas, huéspedes y total antes de confirmar."
                headingClassName="font-semibold tracking-tight"
                className="pr-2"
              />
            </div>

            <Button onClick={onClose} variant="ghost" size="icon" aria-label="Cerrar confirmación de reserva" className="h-10 w-10 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700" disabled={confirmLoading}>
              <Icons.X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-6 text-slate-700 sm:p-7">
          <Card padding="sm" variant="muted" className="rounded-[26px] border-slate-200/80 bg-slate-50/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Propiedad</div>
                <div id={titleId} className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{propertyTitle}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Por noche</div>
                <div className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(nightly)}</div>
              </div>
            </div>
          </Card>

          <div id={descriptionId} className="grid gap-3 sm:grid-cols-3">
            <Card padding="sm" variant="muted" className="rounded-[24px] border-slate-200/80 bg-white">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <Icons.Calendar className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ingreso</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(checkIn)}</div>
                </div>
              </div>
            </Card>

            <Card padding="sm" variant="muted" className="rounded-[24px] border-slate-200/80 bg-white">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icons.Calendar className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Salida</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(checkOut)}</div>
                </div>
              </div>
            </Card>

            <Card padding="sm" variant="muted" className="rounded-[24px] border-slate-200/80 bg-white">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Icons.Users className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Huéspedes</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatGuestSummary(adults, children)}</div>
                </div>
              </div>
            </Card>
          </div>

          <Card padding="sm" variant="muted" className="rounded-[26px] border-slate-200/80 bg-slate-50/80">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div>{nights} {nights === 1 ? 'noche' : 'noches'} × {formatCurrency(nightly)}</div>
              <div>{formatCurrency(nightly * nights)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-lg font-bold text-slate-950">
              <div>Total estimado</div>
              <div>{formatCurrency(total)}</div>
            </div>
          </Card>

          <NoticeBanner tone={activeNotice.tone} heading={activeNotice.heading} description={activeNotice.description} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button onClick={onClose} variant="secondary" size="lg" className="flex-1 rounded-2xl" disabled={confirmLoading}>Seguir revisando</Button>
            <Button onClick={onConfirm} variant="primary" size="lg" className="flex-1 rounded-2xl" loading={confirmLoading} loadingLabel="Confirmando reserva...">Confirmar reserva</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookingConfirmationModal;
