import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/apiConfig';
import { formatBookingDateShort, getBookingDateOnlyValue, isBookingCheckInReached } from '../lib/bookingDates';
import {
  getReservationFlowCopy,
  getReservationFlowTimeline,
  getReservationNextActorDisplayLabel,
  getReservationNextStepDisplayLabel,
  type ReservationFlowCopy,
  type ReservationFlowTimeline,
  type ReservationFlowViewerRole,
} from '../lib/reservationFlow';
import { normalizeReservationDepositStatus } from '../lib/protectedDepositStatus';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { confirmAccess, confirmArrival, fetchConversations } from '../services/geminiService';
import type {
  Booking,
  Conversation,
  Property,
  ReservationDepositType,
  ReservationRequestMode,
  ReservationRequestStatus,
} from '../types';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Icons } from './Icons';
import { LoadingState } from './LoadingState';
import { AccountModeSwitch } from './ui/AccountModeSwitch';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

type HostDashboardData = {
  recentBookings?: Booking[];
  properties?: Array<Pick<Property, 'id' | 'title' | 'imageUrl' | 'location'>>;
};

type OperationActionKey = 'open-chat' | 'confirm-checkin' | 'confirm-access' | 'upload-proof' | 'view-review' | 'view-operation';

type OperationAction = {
  key: OperationActionKey;
  label: string;
};

type OperationProgressState = 'completed' | 'current' | 'upcoming';

type OperationProgressStep = {
  key: 'inquiry' | 'request' | 'deposit' | 'checkin';
  label: string;
  state: OperationProgressState;
};

type OperationCardData = {
  id: string;
  propertyTitle: string;
  propertyLocation: string;
  imageUrl: string;
  roleLabel: 'Huésped' | 'Anfitrión';
  statusLabel: string;
  summary: string;
  helper: string | null;
  actorLabel: string;
  nextStepLabel: string;
  dateLabel: string | null;
  sortDateValue: number;
  flowCopy: ReservationFlowCopy;
  timeline: ReservationFlowTimeline | null;
  progressSteps: OperationProgressStep[];
  action: OperationAction;
  conversationId?: string;
  bookingId?: string;
  canPerformInlineAction: boolean;
};

const DEFAULT_OPERATION_IMAGE = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80';

const getBackFallbackPath = (viewerRole: ReservationFlowViewerRole) => (
  viewerRole === 'host' ? '/host-dashboard' : '/profile'
);

const formatOperationDateRange = (startDate?: string | null, endDate?: string | null) => {
  const normalizedStartDate = getBookingDateOnlyValue(startDate ?? undefined);
  const normalizedEndDate = getBookingDateOnlyValue(endDate ?? undefined);

  if (!normalizedStartDate && !normalizedEndDate) {
    return null;
  }

  if (!normalizedStartDate || !normalizedEndDate) {
    return formatBookingDateShort(normalizedStartDate ?? normalizedEndDate ?? '');
  }

  return `${formatBookingDateShort(normalizedStartDate)} - ${formatBookingDateShort(normalizedEndDate)}`;
};

const getResolvedBookingRequestStatus = (booking?: Partial<Booking> | null): ReservationRequestStatus | undefined => {
  if (!booking) {
    return undefined;
  }

  if (booking.requestStatus) {
    return booking.requestStatus;
  }

  if (booking.requestMode !== 'protected') {
    return undefined;
  }

  const normalizedDepositStatus = normalizeReservationDepositStatus(booking.depositStatus, {
    guestCheckinConfirmed: booking.guestCheckinConfirmed,
    hostAccessConfirmed: booking.hostAccessConfirmed,
  });

  return normalizedDepositStatus === 'held'
    || normalizedDepositStatus === 'guest_checkin_confirmed'
    || normalizedDepositStatus === 'host_access_confirmed'
    || normalizedDepositStatus === 'deposit_released'
    || booking.status === 'confirmed'
    ? 'accepted'
    : 'pending';
};

const shouldHideOperationStage = (stage: ReservationFlowCopy['stage']) => (
  stage === null
  || stage === 'request-not-advanced'
  || stage === 'guest-cancelled'
  || stage === 'host-cancelled'
);

const getOperationProgressSteps = (flowCopy: ReservationFlowCopy, timeline: ReservationFlowTimeline | null): OperationProgressStep[] => {
  const currentGroup = timeline?.currentStepKey === 'completed'
    ? 'checkin'
    : timeline?.currentStepKey === 'confirmation' || timeline?.currentStepKey === 'deposit'
      ? 'deposit'
      : timeline?.currentStepKey === 'checkin'
        ? 'checkin'
        : timeline?.currentStepKey === 'request'
          ? 'request'
          : 'inquiry';

  const stepOrder: OperationProgressStep['key'][] = ['inquiry', 'request', 'deposit', 'checkin'];
  const currentIndex = stepOrder.indexOf(currentGroup);
  const depositLabel = flowCopy.stage === 'request-accepted'
    || flowCopy.stage === 'protected-checkout-pending'
    || flowCopy.stage === 'external-deposit-pending'
    || flowCopy.stage === 'deposit-choice'
      ? 'Esperando seña'
      : 'Seña reportada';

  return [
    { key: 'inquiry', label: 'Consulta iniciada', state: 'upcoming' },
    { key: 'request', label: 'Reserva solicitada', state: 'upcoming' },
    { key: 'deposit', label: depositLabel, state: 'upcoming' },
    { key: 'checkin', label: 'Check-in', state: 'upcoming' },
  ].map((step, index) => ({
    ...step,
    state: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
  }));
};

const getOperationAction = (
  viewerRole: ReservationFlowViewerRole,
  flowCopy: ReservationFlowCopy,
  bookingId: string | undefined,
  conversationId: string | undefined,
  startDate?: string | null,
): OperationAction => {
  const arrivalActionsAvailable = isBookingCheckInReached(startDate ?? undefined);

  if (flowCopy.stage === 'protected-deposit-review' || flowCopy.stage === 'protected-no-show-pending') {
    return { key: 'view-review', label: 'Ver revisión' };
  }

  if (viewerRole === 'guest' && bookingId && flowCopy.stage === 'protected-deposit-held' && flowCopy.state !== 'guest_checkin_confirmed' && arrivalActionsAvailable) {
    return { key: 'confirm-checkin', label: 'Confirmar check-in' };
  }

  if (viewerRole === 'host' && bookingId && flowCopy.state === 'guest_checkin_confirmed' && arrivalActionsAvailable) {
    return { key: 'confirm-access', label: 'Confirmar acceso' };
  }

  if (
    conversationId
    && viewerRole === 'guest'
    && (
      flowCopy.stage === 'request-accepted'
      || flowCopy.stage === 'external-deposit-pending'
      || flowCopy.stage === 'direct-deposit-reported'
    )
    && flowCopy.modelLabel === 'Operación libre'
  ) {
    return { key: 'upload-proof', label: 'Subir comprobante' };
  }

  if (conversationId) {
    return { key: 'open-chat', label: 'Abrir chat' };
  }

  return { key: 'view-operation', label: 'Ver operación' };
};

const getOperationPriority = (operation: OperationCardData) => {
  switch (operation.action.key) {
    case 'view-review':
      return 0;
    case 'confirm-checkin':
    case 'confirm-access':
      return 1;
    case 'upload-proof':
      return 2;
    case 'open-chat':
      return 3;
    default:
      return 4;
  }
};

const getOperationSortDate = (booking?: Partial<Booking> | null, conversation?: Conversation | null) => {
  const preferredDate = booking?.startDate
    ?? conversation?.requestStartDate
    ?? conversation?.startDate
    ?? conversation?.updated_at
    ?? conversation?.created_at;
  const parsedValue = preferredDate ? new Date(preferredDate).getTime() : Number.MAX_SAFE_INTEGER;

  return Number.isFinite(parsedValue) ? parsedValue : Number.MAX_SAFE_INTEGER;
};

const OperationTimeline = ({ steps }: { steps: OperationProgressStep[] }) => (
  <ol className="grid grid-cols-4 gap-2">
    {steps.map((step) => {
      const markerClassName = step.state === 'completed'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
        : step.state === 'current'
          ? 'border-brand/20 bg-brand/10 text-brand dark:border-brand/25 dark:bg-brand/12 dark:text-brand-light'
          : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-500';

      return (
        <li key={step.key} className="min-w-0 rounded-[18px] border border-slate-200/80 bg-slate-50/85 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold', markerClassName)}>
              {step.state === 'completed' ? <Icons.Check className="h-3.5 w-3.5" /> : step.state === 'current' ? <Icons.Clock className="h-3.5 w-3.5" /> : <Icons.Circle className="h-3 w-3" />}
            </span>
            <span className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.12em]',
              step.state === 'completed'
                ? 'text-emerald-600 dark:text-emerald-300'
                : step.state === 'current'
                  ? 'text-brand dark:text-brand-light'
                  : 'text-slate-400 dark:text-slate-500',
            )}>
              {step.state === 'completed' ? 'Hecho' : step.state === 'current' ? 'Ahora' : 'Luego'}
            </span>
          </div>
          <p className={cn(
            'mt-2 text-xs leading-5',
            step.state === 'upcoming' ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-slate-50',
          )}>
            {step.label}
          </p>
        </li>
      );
    })}
  </ol>
);

const buildOperationCard = (
  viewerRole: ReservationFlowViewerRole,
  booking: Booking | null,
  conversation: Conversation | null,
  propertyById: Map<string, Pick<Property, 'id' | 'title' | 'imageUrl' | 'location'>>,
  propertyByTitle: Map<string, Pick<Property, 'id' | 'title' | 'imageUrl' | 'location'>>,
): OperationCardData | null => {
  const matchedProperty = booking?.propertyId
    ? propertyById.get(booking.propertyId)
    : undefined;
  const propertyFallback = matchedProperty
    ?? (booking?.propertyTitle ? propertyByTitle.get(booking.propertyTitle) : undefined)
    ?? (conversation?.propertyTitle ? propertyByTitle.get(conversation.propertyTitle) : undefined);
  const mode = booking?.requestMode ?? conversation?.requestMode;

  if (!mode) {
    return null;
  }

  const flowCopy = getReservationFlowCopy({
    mode,
    depositType: booking?.depositType ?? conversation?.depositType,
    requestStatus: booking?.requestStatus ?? getResolvedBookingRequestStatus(booking) ?? conversation?.requestStatus,
    bookingStatus: booking?.status ?? conversation?.bookingStatus,
    depositStatus: booking?.depositStatus ?? conversation?.depositStatus,
    cancellationActor: booking?.cancellationActor ?? conversation?.cancellationActor,
    startDate: booking?.startDate ?? conversation?.requestStartDate ?? conversation?.startDate,
    guestCheckinConfirmed: booking?.guestCheckinConfirmed ?? conversation?.guestCheckinConfirmed,
    hostAccessConfirmed: booking?.hostAccessConfirmed ?? conversation?.hostAccessConfirmed,
    viewerRole,
  });

  if (shouldHideOperationStage(flowCopy.stage)) {
    return null;
  }

  const timeline = getReservationFlowTimeline({
    mode,
    depositType: booking?.depositType ?? conversation?.depositType,
    requestStatus: booking?.requestStatus ?? getResolvedBookingRequestStatus(booking) ?? conversation?.requestStatus,
    bookingStatus: booking?.status ?? conversation?.bookingStatus,
    depositStatus: booking?.depositStatus ?? conversation?.depositStatus,
    cancellationActor: booking?.cancellationActor ?? conversation?.cancellationActor,
    startDate: booking?.startDate ?? conversation?.requestStartDate ?? conversation?.startDate,
    guestCheckinConfirmed: booking?.guestCheckinConfirmed ?? conversation?.guestCheckinConfirmed,
    hostAccessConfirmed: booking?.hostAccessConfirmed ?? conversation?.hostAccessConfirmed,
    viewerRole,
  });
  const conversationId = booking?.conversationId ?? conversation?.id;
  const bookingId = booking?.id ?? conversation?.booking_id;
  const statusLabel = timeline?.status.label ?? flowCopy.statusLabel ?? 'Operación en curso';
  const nextStepLabel = getReservationNextStepDisplayLabel(flowCopy);
  const action = getOperationAction(viewerRole, flowCopy, bookingId, conversationId, booking?.startDate ?? conversation?.requestStartDate ?? conversation?.startDate);

  return {
    id: booking?.id ?? conversation?.id ?? `${mode}-${viewerRole}`,
    propertyTitle: booking?.propertyTitle ?? conversation?.propertyTitle ?? propertyFallback?.title ?? 'Propiedad en coordinación',
    propertyLocation: booking?.location ?? propertyFallback?.location ?? 'Ubicación en coordinación',
    imageUrl: booking?.imageUrl ?? conversation?.propertyImage ?? propertyFallback?.imageUrl ?? DEFAULT_OPERATION_IMAGE,
    roleLabel: viewerRole === 'guest' ? 'Huésped' : 'Anfitrión',
    statusLabel,
    summary: flowCopy.description ?? 'Seguí esta operación desde un solo lugar.',
    helper: flowCopy.supportText ?? flowCopy.trackingHint ?? null,
    actorLabel: getReservationNextActorDisplayLabel(flowCopy),
    nextStepLabel,
    dateLabel: formatOperationDateRange(booking?.startDate ?? conversation?.requestStartDate ?? conversation?.startDate, booking?.endDate ?? conversation?.requestEndDate ?? conversation?.endDate),
    sortDateValue: getOperationSortDate(booking, conversation),
    flowCopy,
    timeline,
    progressSteps: getOperationProgressSteps(flowCopy, timeline),
    action,
    conversationId,
    bookingId,
    canPerformInlineAction: action.key === 'confirm-checkin' || action.key === 'confirm-access',
  };
};

export const MyOperations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerRole: ReservationFlowViewerRole = user?.activeMode === 'host' ? 'host' : 'guest';
  const [guestBookings, setGuestBookings] = useState<Booking[]>([]);
  const [hostDashboardData, setHostDashboardData] = useState<HostDashboardData | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingOperationId, setProcessingOperationId] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      if (viewerRole === 'host') {
        const [dashboardResponse, conversationsResponse] = await Promise.all([
          apiJson<HostDashboardData>('/api/host/dashboard', { includeCredentials: true, ttlMs: 60_000 }),
          fetchConversations(),
        ]);

        setHostDashboardData(dashboardResponse);
        setGuestBookings([]);
        setConversations(Array.isArray(conversationsResponse) ? conversationsResponse : []);
      } else {
        const [bookingsResponse, conversationsResponse] = await Promise.all([
          apiJson<Booking[]>('/api/bookings/all', { includeCredentials: true }),
          fetchConversations(),
        ]);

        setGuestBookings(Array.isArray(bookingsResponse) ? bookingsResponse : []);
        setHostDashboardData(null);
        setConversations(Array.isArray(conversationsResponse) ? conversationsResponse : []);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No pudimos cargar tus operaciones.');
    } finally {
      setLoading(false);
    }
  }, [viewerRole]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  const operations = useMemo(() => {
    const propertyById = new Map<string, Pick<Property, 'id' | 'title' | 'imageUrl' | 'location'>>();
    const propertyByTitle = new Map<string, Pick<Property, 'id' | 'title' | 'imageUrl' | 'location'>>();

    for (const property of hostDashboardData?.properties ?? []) {
      if (property.id) {
        propertyById.set(property.id, property);
      }

      if (property.title) {
        propertyByTitle.set(property.title, property);
      }
    }

    const bookings = viewerRole === 'host'
      ? hostDashboardData?.recentBookings ?? []
      : guestBookings;
    const matchedConversationIds = new Set<string>();
    const nextOperations: OperationCardData[] = [];

    for (const booking of bookings) {
      const matchedConversation = conversations.find((conversation) => (
        Boolean(booking.conversationId && conversation.id === booking.conversationId)
        || Boolean(conversation.booking_id && conversation.booking_id === booking.id)
      )) ?? null;

      if (matchedConversation?.id) {
        matchedConversationIds.add(matchedConversation.id);
      }

      const nextOperation = buildOperationCard(viewerRole, booking, matchedConversation, propertyById, propertyByTitle);

      if (nextOperation) {
        nextOperations.push(nextOperation);
      }
    }

    for (const conversation of conversations) {
      if (matchedConversationIds.has(conversation.id)) {
        continue;
      }

      const nextOperation = buildOperationCard(viewerRole, null, conversation, propertyById, propertyByTitle);

      if (nextOperation) {
        nextOperations.push(nextOperation);
      }
    }

    return nextOperations
      .sort((left, right) => {
        const priorityDifference = getOperationPriority(left) - getOperationPriority(right);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return left.sortDateValue - right.sortDateValue;
      });
  }, [conversations, guestBookings, hostDashboardData, viewerRole]);

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(getBackFallbackPath(viewerRole), { replace: true });
  };

  const handleAction = async (operation: OperationCardData) => {
    if (operation.action.key === 'open-chat' && operation.conversationId) {
      navigate(`/chat/${operation.conversationId}`);
      return;
    }

    if (operation.action.key === 'upload-proof' && operation.conversationId) {
      navigate(`/chat/${operation.conversationId}`);
      return;
    }

    if (operation.action.key === 'view-review') {
      if (operation.conversationId) {
        navigate(`/chat/${operation.conversationId}`);
        return;
      }

      navigate(viewerRole === 'host' ? '/host-dashboard' : '/my-bookings');
      return;
    }

    if (operation.action.key === 'view-operation') {
      navigate(viewerRole === 'host' ? '/host-dashboard' : '/my-bookings');
      return;
    }

    if (!operation.bookingId) {
      return;
    }

    setProcessingOperationId(operation.id);

    try {
      if (operation.action.key === 'confirm-checkin') {
        await confirmArrival(operation.bookingId);
        showToast('Check-in confirmado', 'Quedó registrado. Ahora esperamos la confirmación del anfitrión.', 'success');
      }

      if (operation.action.key === 'confirm-access') {
        await confirmAccess(operation.bookingId);
        showToast('Acceso confirmado', 'La operación quedó lista para cerrarse desde este flujo.', 'success');
      }

      await loadOperations();
    } catch (error) {
      showToast(
        'No pudimos actualizar la operación',
        error instanceof Error ? error.message : 'Probá de nuevo en unos minutos.',
        'error',
      );
    } finally {
      setProcessingOperationId(null);
    }
  };

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Cargando tus operaciones..."
        description="Estamos reuniendo reservas, conversaciones y próximos pasos para que veas todo desde una sola vista."
      />
    );
  }

  if (loadError) {
    return (
      <ErrorState
        fullScreen
        title="No pudimos cargar tus operaciones"
        description={loadError}
        onRetry={() => void loadOperations()}
        onDismiss={handleBack}
        dismissLabel="Volver"
      />
    );
  }

  return (
    <div className="app-page py-6 md:py-8">
      <div className="space-y-6">
        <Card
          variant="elevated"
          padding="none"
          className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)]"
        >
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-600 transition-colors hover:border-brand/20 hover:text-brand dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
                >
                  <Icons.ArrowLeft className="h-5 w-5" />
                </button>
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand dark:border-brand/20 dark:bg-brand/10 dark:text-brand-light">
                  <Icons.Activity className="h-3.5 w-3.5" />
                  Centro operativo
                </span>
              </div>
              <AccountModeSwitch compact />
            </div>

            <div className="mt-6 max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Mis operaciones</h1>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Acá ves qué operaciones siguen activas, en qué estado está cada una y cuál es la próxima acción que conviene hacer ahora.
              </p>
            </div>
          </div>
        </Card>

        {operations.length === 0 ? (
          <EmptyState
            eyebrow="Mis operaciones"
            tone="soft"
            icon={<Icons.LayoutGrid className="h-12 w-12 text-brand" />}
            title={viewerRole === 'host' ? 'Todavía no tenés operaciones activas como anfitrión' : 'Todavía no tenés operaciones activas'}
            description={viewerRole === 'host'
              ? 'Cuando tengas consultas, reservas o seguimientos en curso, los vas a ver centralizados acá.'
              : 'Cuando tengas una consulta, una reserva o una coordinación en marcha, todo va a quedar ordenado en esta vista.'}
            action={{
              label: viewerRole === 'host' ? 'Ir al perfil' : 'Explorar propiedades',
              onClick: () => navigate(viewerRole === 'host' ? '/profile' : '/'),
            }}
          />
        ) : (
          <div className="grid gap-4">
            {operations.map((operation) => {
              const isProcessing = processingOperationId === operation.id;

              return (
                <Card key={operation.id} padding="none" className="overflow-hidden border-slate-200/80 bg-white/96 dark:border-slate-800 dark:bg-slate-950/92">
                  <div className="flex flex-col gap-5 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <img
                          src={operation.imageUrl}
                          alt={operation.propertyTitle}
                          className="h-24 w-28 shrink-0 rounded-[22px] object-cover"
                        />
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {operation.roleLabel}
                            </span>
                            <span className={cn(
                              'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                              operation.flowCopy.stage === 'protected-deposit-review' || operation.flowCopy.stage === 'protected-no-show-pending'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300'
                                : operation.timeline?.status.tone === 'success'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                                  : 'border-brand/15 bg-brand/8 text-brand dark:border-brand/20 dark:bg-brand/10 dark:text-brand-light',
                            )}>
                              {operation.statusLabel}
                            </span>
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{operation.propertyTitle}</h2>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <Icons.MapPin className="h-4 w-4" />
                                {operation.propertyLocation}
                              </span>
                              {operation.dateLabel ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Icons.Calendar className="h-4 w-4" />
                                  {operation.dateLabel}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={operation.action.key === 'open-chat' ? 'secondary' : 'primary'}
                        onClick={() => void handleAction(operation)}
                        loading={isProcessing}
                        loadingLabel="Actualizando..."
                        className="rounded-full"
                      >
                        <>
                          {operation.action.key === 'open-chat' || operation.action.key === 'upload-proof' || operation.action.key === 'view-review'
                            ? <Icons.MessageSquare className="h-4 w-4" />
                            : <Icons.CheckCircle2 className="h-4 w-4" />}
                          {operation.action.label}
                        </>
                      </Button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                      <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Estado actual</p>
                          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{operation.summary}</p>
                          {operation.helper ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{operation.helper}</p> : null}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Actúa ahora</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{operation.actorLabel}</p>
                          </div>
                          <div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Próximo paso</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{operation.nextStepLabel}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white/92 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Timeline simple</p>
                        <OperationTimeline steps={operation.progressSteps} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOperations;