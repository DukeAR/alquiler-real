import React, { useEffect, useId, useState } from 'react';
import { formatCurrency } from '../lib/utils';
import { type ReservationRequestMode } from '../types';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { NoticeBanner } from './ui/NoticeBanner';
import { SectionTitle } from './ui/SectionTitle';
import { formatBookingDateOnly } from '../lib/bookingDates';

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
  onStartDirect: () => void;
  onStartProtected: () => void;
  propertyTitle: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  nightly: number;
  total: number;
  actionLoadingMode?: ReservationRequestMode | null;
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
  onStartDirect,
  onStartProtected,
  propertyTitle,
  hostName,
  checkIn,
  checkOut,
  nights,
  adults,
  children,
  nightly,
  total,
  actionLoadingMode = null,
  submitNotice = null,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const decisionItems: DecisionItemProps[] = [
    {
      icon: Icons.Home,
      label: 'Propiedad',
      value: propertyTitle,
      helper: 'La propuesta que estás por mandar.',
    },
    {
      icon: Icons.UserCheck,
      label: 'Anfitrión',
      value: hostName,
      helper: 'Con quién vas a seguir la charla.',
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
  const isBusy = actionLoadingMode !== null;

  const activeNotice = submitNotice ?? {
    tone: 'info' as const,
    heading: 'Elegí cómo querés seguir con estas fechas',
    description: 'Podés abrir un acuerdo directo por chat o dejar una solicitud en la app. En ambos casos después seguís por mensajes.',
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
    if (!visible || isBusy) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, isBusy, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          if (!isBusy) {
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
                  <Icons.MessageSquare className="h-3.5 w-3.5" />
                  <span>Propuesta lista para enviar</span>
                </Badge>
                <Badge variant="neutral" size="md" className="gap-2">
                  <Icons.Clock className="h-3.5 w-3.5" />
                  <span>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                </Badge>
                <Badge variant="neutral" size="md" className="gap-2">
                  <Icons.FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>{formatCurrency(total)} estimado</span>
                </Badge>
              </div>

              <SectionTitle
                as="h3"
                visualLevel="h3"
                heading="Elegí cómo querés avanzar con esta estadía"
                description="Las fechas, huéspedes y total ya reflejan tu selección actual. Ahora definí si querés abrir un acuerdo directo por chat o dejar una solicitud en la app."
                headingClassName="font-semibold tracking-tight"
                className="pr-2"
              />
            </div>

            <Button onClick={onClose} variant="ghost" size="icon" aria-label="Cerrar solicitud" className="h-10 w-10 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700" disabled={isBusy}>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Card padding="md" variant="muted" className="rounded-[28px] border-slate-200/80 bg-white">
              <div className="flex h-full flex-col gap-4">
                <div className="space-y-2">
                  <Badge variant="neutral" size="md" className="gap-2">
                    <Icons.MessageSquare className="h-3.5 w-3.5" />
                    <span>Acuerdo directo</span>
                  </Badge>
                  <p className="text-base font-semibold text-slate-950">Mandás una propuesta por chat</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Sirve si querés conversar primero. Las fechas no se bloquean y la plataforma no interviene en la seña.
                  </p>
                </div>

                <Button
                  onClick={onStartDirect}
                  variant="secondary"
                  size="lg"
                  className="mt-auto rounded-2xl"
                  loading={actionLoadingMode === 'direct'}
                  loadingLabel="Abriendo chat..."
                  disabled={isBusy && actionLoadingMode !== 'direct'}
                >
                  Enviar propuesta por chat
                </Button>
              </div>
            </Card>

            <Card padding="md" variant="muted" className="rounded-[28px] border-brand/15 bg-brand/5">
              <div className="flex h-full flex-col gap-4">
                <div className="space-y-2">
                  <Badge variant="brand" size="md" className="gap-2">
                    <Icons.ShieldCheck className="h-3.5 w-3.5" />
                    <span>Solicitud en la app</span>
                  </Badge>
                  <p className="text-base font-semibold text-slate-950">La solicitud queda pendiente en la app</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Conviene si querés dejar fechas, huéspedes y total asentados desde ahora mientras esperás la respuesta del anfitrión y después avanzar con la seña dentro de la app.
                  </p>
                </div>

                <Button
                  onClick={onStartProtected}
                  variant="primary"
                  size="lg"
                  className="mt-auto rounded-2xl"
                  loading={actionLoadingMode === 'protected'}
                  loadingLabel="Enviando solicitud..."
                  disabled={isBusy && actionLoadingMode !== 'protected'}
                >
                  Enviar solicitud en la app
                </Button>
              </div>
            </Card>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button onClick={onClose} variant="secondary" size="lg" className="flex-1 rounded-2xl" disabled={isBusy}>Seguir revisando</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookingConfirmationModal;
