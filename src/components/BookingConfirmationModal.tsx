import React, { useEffect, useId, useState } from 'react';
import { formatCurrency } from '../lib/utils';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { NoticeBanner } from './ui/NoticeBanner';
import { SectionTitle } from './ui/SectionTitle';
import { formatBookingDateOnly, formatBookingDateTime, getCancellationDeadlineFromStartDate } from '../lib/bookingDates';

type DecisionItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  accent?: boolean;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  propertyTitle: string;
  hostName: string;
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

const DecisionItemCard: React.FC<DecisionItemProps> = ({ icon: Icon, label, value, helper, accent = false }) => {
  return (
    <Card padding="sm" variant="muted" className={`rounded-[24px] border-slate-200/80 ${accent ? 'bg-brand/5' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accent ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{helper}</div>
        </div>
      </div>
    </Card>
  );
};

const BookingConfirmationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  propertyTitle,
  hostName,
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
  const decisionItems: DecisionItemProps[] = [
    {
      icon: Icons.Home,
      label: 'Propiedad',
      value: propertyTitle,
      helper: 'La opción que estás por confirmar.',
    },
    {
      icon: Icons.UserCheck,
      label: 'Anfitrión',
      value: hostName,
      helper: 'Con quién vas a coordinar la estadía.',
    },
    {
      icon: Icons.Calendar,
      label: 'Fechas',
      value: `${formatDate(checkIn)} al ${formatDate(checkOut)}`,
      helper: formatGuestSummary(adults, children),
    },
    {
      icon: Icons.FileSpreadsheet,
      label: 'Total',
      value: formatCurrency(total),
      helper: `${nights} ${nights === 1 ? 'noche' : 'noches'} × ${formatCurrency(nightly)}`,
      accent: true,
    },
  ];

  const activeNotice = submitNotice ?? {
    tone: 'info' as const,
    heading: 'Revisá la decisión antes de confirmar',
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
                  <span>Estadía lista para confirmar</span>
                </Badge>
                <Badge variant="neutral" size="md" className="gap-2">
                  <Icons.Clock className="h-3.5 w-3.5" />
                  <span>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                </Badge>
              </div>

              <SectionTitle
                as="h3"
                visualLevel="h3"
                heading="Confirmá tu estadía"
                description="Revisá la decisión final antes de confirmarla."
                headingClassName="font-semibold tracking-tight"
                className="pr-2"
              />
            </div>

            <Button onClick={onClose} variant="ghost" size="icon" aria-label="Cerrar confirmación de estadía" className="h-10 w-10 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700" disabled={confirmLoading}>
              <Icons.X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-6 text-slate-700 sm:p-7">
          <div id={titleId} className="sr-only">{propertyTitle}</div>
          <div id={descriptionId} className="grid gap-3 sm:grid-cols-2">
            {decisionItems.map((item) => (
              <DecisionItemCard key={item.label} {...item} />
            ))}
          </div>

          <NoticeBanner tone={activeNotice.tone} heading={activeNotice.heading} description={activeNotice.description} />

          <p className="text-sm font-medium text-slate-600">
            Vas a ver todos los detalles antes de finalizar.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button onClick={onClose} variant="secondary" size="lg" className="flex-1 rounded-2xl" disabled={confirmLoading}>Seguir revisando</Button>
            <Button onClick={onConfirm} variant="primary" size="lg" className="flex-1 rounded-2xl" loading={confirmLoading} loadingLabel="Confirmando estadía...">Confirmar estadía</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookingConfirmationModal;
