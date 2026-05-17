import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import type { SupportCaseReviewHistoryEntry } from '../lib/contextualSupport';
import { clearInternalSupportSecret, persistInternalSupportSecret, readInternalSupportSecret } from '../lib/internalSupportAccess';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Icons } from './Icons';
import { LoadingState } from './LoadingState';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';
import { OperationalReviewPolicyCard } from './ui/OperationalReviewPolicyCard';

type InternalSupportStatus = 'received' | 'in_review' | 'waiting_response' | 'resolved';
type InternalSupportFilter = 'open' | 'all' | InternalSupportStatus;

type InternalSupportCase = {
  id: string;
  entryPoint: string;
  entryPointLabel: string;
  category: string;
  categoryLabel: string;
  description: string | null;
  status: InternalSupportStatus;
  statusLabel: string;
  statusNote: string | null;
  lastStatusBy: string | null;
  propertyId: string | null;
  bookingId: string | null;
  conversationId: string | null;
  reviewType: string | null;
  createdAt: string;
  updatedAt: string;
  lastStatusAt: string;
  reviewHistory?: SupportCaseReviewHistoryEntry[];
  user: {
    id: string | null;
    name: string;
    role: string | null;
  };
  property: {
    id: string;
    title: string;
  } | null;
  operation: {
    bookingId: string | null;
    conversationId: string | null;
    reviewType: string | null;
    operationId: string | null;
    operationType: string | null;
    viewerRole: string | null;
    requestMode: string | null;
    requestStatus: string | null;
    depositStatus: string | null;
    operationStatus: string | null;
  };
  timestamps: Record<string, unknown>;
  contextSnapshot: Record<string, unknown>;
};

type InternalSupportQueueResponse = {
  items: InternalSupportCase[];
};

type InternalSupportReviewResponse = {
  success: boolean;
  case: InternalSupportCase;
};

type InternalOperator = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  isInternalOperator: boolean;
  createdAt: string;
};

type InternalOperatorsResponse = {
  items: InternalOperator[];
};

type InternalOperatorUpdateResponse = {
  success: boolean;
  user: InternalOperator;
};

type InternalModerationItem = {
  id: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  severity: 'standard' | 'severe';
  reason: string;
  reasonLabel: string;
  description: string | null;
  reporterWeight: number;
  user: {
    id: string | null;
    name: string;
  };
  property: {
    id: string;
    title: string;
  } | null;
  history: {
    recentReportsCount: number;
    confirmedReportsCount: number;
    recentModerationEvents: Array<{
      eventType: string;
      reason: string | null;
      createdAt: string;
    }>;
  };
  risk: {
    level: string;
    flags: string[];
    manualReviewRequired: boolean;
    visibilityPenalty: number;
  };
  strikes: number;
  appliedStrikeDelta: number;
  reviewNotes: string | null;
  reviewedBy: string | null;
};

type InternalModerationQueueResponse = {
  items: InternalModerationItem[];
};

type PropertyVerificationReviewAction = 'approve-documents' | 'reject-documents' | 'complete-manual-review' | 'clear-manual-review' | 'mark-reverification-pending';
type PropertyVerificationTriggerReason = 'expiration' | 'address_change' | 'relevant_report' | 'detected_inconsistency';
type PropertyVerificationMaintenanceStatus = 'verified' | 'requires_reverification' | 'reverification_pending';
type PropertyVerificationOperationalStatus = 'pending_schedule' | 'scheduled' | 'in_progress' | 'approved' | 'requires_review' | 'not_completed';

type InternalPropertyVerificationItem = {
  propertyId: string;
  propertyTitle: string | null;
  hostId: string | null;
  hostName: string | null;
  pendingDocumentsCount: number;
  documents: Array<{
    id: string;
    originalName: string | null;
    verificationStatus: string;
    url: string;
    createdAt: string;
  }>;
  onsiteOrderId: string | null;
  onsiteOperationalStatus: PropertyVerificationOperationalStatus | null;
  onsiteOperationalLabel: string | null;
  onsiteOperationalDescription: string | null;
  onsiteAppointmentDate: string | null;
  onsiteVerifierName: string | null;
  onsiteMaintenanceStatus: PropertyVerificationMaintenanceStatus | null;
  onsiteMaintenanceLabel: string | null;
  onsiteMaintenanceDescription: string | null;
  onsiteLastValidatedAt: string | null;
  onsiteExpiresAt: string | null;
  onsiteTriggerReason: PropertyVerificationTriggerReason | null;
  onsiteNeedsRefresh: boolean;
  onsiteCurrentlyValid: boolean;
};

type InternalPropertyVerificationQueueResponse = {
  items: InternalPropertyVerificationItem[];
};

type InternalPropertyVerificationReviewResponse = {
  success?: boolean;
  propertyId: string;
  action: PropertyVerificationReviewAction;
};

const FILTER_OPTIONS: Array<{ value: InternalSupportFilter; label: string }> = [
  { value: 'open', label: 'Abiertos' },
  { value: 'received', label: 'Recibidos' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'waiting_response', label: 'Esperando respuesta' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'all', label: 'Todos' },
];

const STATUS_ACTIONS: Array<{ value: InternalSupportStatus; label: string; helper: string }> = [
  { value: 'received', label: 'Marcar recibido', helper: 'Deja constancia de que el caso ya entró a la cola.' },
  { value: 'in_review', label: 'Pasar a revisión', helper: 'Indica que ya hay una revisión activa sobre el caso.' },
  { value: 'waiting_response', label: 'Pedir respuesta', helper: 'Úsalo cuando falte una aclaración del usuario o la contraparte.' },
  { value: 'resolved', label: 'Resolver', helper: 'Cierra el caso con la información operativa disponible.' },
];

const RECOMMENDED_NEXT_STATUS: Record<InternalSupportStatus, InternalSupportStatus> = {
  received: 'in_review',
  in_review: 'waiting_response',
  waiting_response: 'resolved',
  resolved: 'resolved',
};

const STATUS_ACTION_ORDER = new Map(STATUS_ACTIONS.map((action, index) => [action.value, index]));

const STATUS_VARIANTS: Record<InternalSupportStatus, React.ComponentProps<typeof Badge>['variant']> = {
  received: 'info',
  in_review: 'brand',
  waiting_response: 'warning',
  resolved: 'success',
};

const PROPERTY_REVERIFICATION_REASON_OPTIONS: Array<{ value: PropertyVerificationTriggerReason; label: string }> = [
  { value: 'expiration', label: 'Vencimiento temporal' },
  { value: 'address_change', label: 'Cambio importante de dirección' },
  { value: 'relevant_report', label: 'Reportes relevantes' },
  { value: 'detected_inconsistency', label: 'Inconsistencias detectadas' },
];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Sin fecha';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const getSupportReviewActorLabel = (entry: SupportCaseReviewHistoryEntry) => {
  if (entry.actorName) {
    return entry.actorName;
  }

  return entry.actorType === 'internal_operator' ? 'Operador interno' : 'Usuario';
};

const formatLabel = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getPropertyTriggerReasonLabel = (value?: PropertyVerificationTriggerReason | null) => {
  if (!value) {
    return null;
  }

  return PROPERTY_REVERIFICATION_REASON_OPTIONS.find((option) => option.value === value)?.label ?? formatLabel(value);
};

const getPropertyVerificationActionLabel = (action: PropertyVerificationReviewAction) => {
  switch (action) {
    case 'approve-documents':
      return 'Documentación aprobada';
    case 'reject-documents':
      return 'Documentación rechazada';
    case 'complete-manual-review':
      return 'Verificación presencial aprobada';
    case 'clear-manual-review':
      return 'Validación presencial despejada';
    case 'mark-reverification-pending':
      return 'Reverificación pendiente registrada';
  }
};

const buildTimestampSummary = (timestamps: Record<string, unknown>) => {
  return Object.entries(timestamps)
    .slice(0, 3)
    .map(([key, value]) => {
      const label = formatLabel(key);
      const content = typeof value === 'string' ? formatDateTime(value) : null;

      if (!label || !content) {
        return null;
      }

      return `${label}: ${content}`;
    })
    .filter(Boolean) as string[];
};

const getOrderedStatusActions = (currentStatus: InternalSupportStatus) => {
  const recommendedStatus = RECOMMENDED_NEXT_STATUS[currentStatus];

  return [...STATUS_ACTIONS].sort((leftAction, rightAction) => {
    const leftPriority = leftAction.value === recommendedStatus ? 0 : leftAction.value === currentStatus ? 2 : 1;
    const rightPriority = rightAction.value === recommendedStatus ? 0 : rightAction.value === currentStatus ? 2 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return (STATUS_ACTION_ORDER.get(leftAction.value) ?? 0) - (STATUS_ACTION_ORDER.get(rightAction.value) ?? 0);
  });
};

const sortInternalOperators = (operators: InternalOperator[]) => [...operators].sort((leftOperator, rightOperator) => {
  const leftLabel = `${leftOperator.name} ${leftOperator.email}`.trim().toLowerCase();
  const rightLabel = `${rightOperator.name} ${rightOperator.email}`.trim().toLowerCase();
  return leftLabel.localeCompare(rightLabel, 'es');
});

export const InternalSupportQueue: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<InternalSupportFilter>('open');
  const [secretDraft, setSecretDraft] = useState('');
  const [secret, setSecret] = useState('');
  const [cases, setCases] = useState<InternalSupportCase[]>([]);
  const [propertyVerificationItems, setPropertyVerificationItems] = useState<InternalPropertyVerificationItem[]>([]);
  const [moderationItems, setModerationItems] = useState<InternalModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSecret, setSavingSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCaseId, setSavingCaseId] = useState<string | null>(null);
  const [savingPropertyVerificationKey, setSavingPropertyVerificationKey] = useState<string | null>(null);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});
  const [propertyVerificationNotes, setPropertyVerificationNotes] = useState<Record<string, string>>({});
  const [propertyTriggerReasons, setPropertyTriggerReasons] = useState<Record<string, PropertyVerificationTriggerReason>>({});
  const [operators, setOperators] = useState<InternalOperator[]>([]);
  const [operatorEmailDraft, setOperatorEmailDraft] = useState('');
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [savingOperatorKey, setSavingOperatorKey] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [focusedPropertyVerificationId, setFocusedPropertyVerificationId] = useState<string | null>(null);
  const skipNextSecretLoadRef = useRef(false);
  const propertyVerificationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const reviewerName = useMemo(() => user?.email || user?.name || 'internal_ops', [user?.email, user?.name]);
  const currentUserId = typeof user?.id === 'string' ? user.id : null;
  const propertyVerificationItemsById = useMemo(() => new Map(
    propertyVerificationItems.map((item) => [item.propertyId, item]),
  ), [propertyVerificationItems]);

  const syncPropertyVerificationFormState = (items: InternalPropertyVerificationItem[]) => {
    setPropertyVerificationNotes((currentNotes) => Object.fromEntries(
      items.map((item) => [item.propertyId, currentNotes[item.propertyId] ?? item.onsiteMaintenanceDescription ?? item.onsiteOperationalDescription ?? '']),
    ));
    setPropertyTriggerReasons((currentReasons) => Object.fromEntries(
      items.map((item) => [item.propertyId, currentReasons[item.propertyId] ?? item.onsiteTriggerReason ?? 'address_change']),
    ));
  };

  const focusPropertyVerificationCard = (propertyId: string) => {
    setFocusedPropertyVerificationId(propertyId);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        propertyVerificationRefs.current[propertyId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      window.setTimeout(() => {
        setFocusedPropertyVerificationId((currentValue) => (currentValue === propertyId ? null : currentValue));
      }, 2400);
    }
  };

  const loadDashboardData = async (accessSecret: string, nextFilter: InternalSupportFilter) => {
    const [nextQueue, nextOperators, nextPropertyQueue, nextModerationQueue] = await Promise.all([
      apiJson<InternalSupportQueueResponse>(`/api/internal/support/review-queue?status=${nextFilter}`, {
        headers: {
          'x-internal-ops-secret': accessSecret,
        },
      }),
      apiJson<InternalOperatorsResponse>('/api/internal/operators', {
        headers: {
          'x-internal-ops-secret': accessSecret,
        },
      }),
      apiJson<InternalPropertyVerificationQueueResponse>('/api/internal/property-verification/review-queue', {
        headers: {
          'x-internal-ops-secret': accessSecret,
        },
      }),
      apiJson<InternalModerationQueueResponse>('/api/internal/moderation/review-queue', {
        headers: {
          'x-internal-ops-secret': accessSecret,
        },
      }),
    ]);

    return {
      queue: nextQueue.items || [],
      operators: sortInternalOperators(nextOperators.items || []),
      propertyQueue: nextPropertyQueue.items || [],
      moderationQueue: nextModerationQueue.items || [],
    };
  };

  const loadPropertyVerificationQueue = async (accessSecret: string) => {
    const response = await apiJson<InternalPropertyVerificationQueueResponse>('/api/internal/property-verification/review-queue', {
      headers: {
        'x-internal-ops-secret': accessSecret,
      },
    });

    return response.items || [];
  };

  const loadPropertyVerificationQueueItem = async (accessSecret: string, propertyId: string) => {
    const response = await apiJson<InternalPropertyVerificationQueueResponse>(`/api/internal/property-verification/review-queue?propertyId=${encodeURIComponent(propertyId)}`, {
      headers: {
        'x-internal-ops-secret': accessSecret,
      },
    });

    return response.items?.[0] ?? null;
  };

  const upsertPropertyVerificationItems = (incomingItems: InternalPropertyVerificationItem[]) => {
    setPropertyVerificationItems((currentItems) => {
      const nextById = new Map(currentItems.map((item) => [item.propertyId, item]));

      incomingItems.forEach((item) => {
        nextById.set(item.propertyId, item);
      });

      const nextItems = Array.from(nextById.values());
      syncPropertyVerificationFormState(nextItems);
      return nextItems;
    });
  };

  useEffect(() => {
    const storedSecret = readInternalSupportSecret();
    if (storedSecret) {
      setSecret(storedSecret);
      setSecretDraft(storedSecret);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!secret) {
      return;
    }

    if (skipNextSecretLoadRef.current) {
      skipNextSecretLoadRef.current = false;
      return;
    }

    let cancelled = false;

    const loadCases = async () => {
      setLoading(true);
      setError(null);

      try {
        const dashboard = await loadDashboardData(secret, filter);

        if (!cancelled) {
          setCases(dashboard.queue);
          setOperators(dashboard.operators);
          setPropertyVerificationItems(dashboard.propertyQueue);
          setModerationItems(dashboard.moderationQueue);
          setCaseNotes((currentNotes) => Object.fromEntries(
            dashboard.queue.map((supportCase) => [supportCase.id, currentNotes[supportCase.id] ?? supportCase.statusNote ?? '']),
          ));
          syncPropertyVerificationFormState(dashboard.propertyQueue);
        }
      } catch (requestError) {
        if (!cancelled) {
          const nextError = requestError instanceof Error ? requestError.message : 'No pudimos cargar la cola interna de soporte.';
          setError(nextError);

          if (/No podés usar esta operación interna/i.test(nextError)) {
            clearInternalSupportSecret();
            setSecret('');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCases();

    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey, secret]);

  const persistSecret = async () => {
    const trimmedSecret = secretDraft.trim();

    if (!trimmedSecret) {
      setError('Ingresá el secreto interno para abrir la cola.');
      return;
    }

    setSavingSecret(true);
    setError(null);
    setOperatorError(null);

    try {
      const dashboard = await loadDashboardData(trimmedSecret, 'open');

      persistInternalSupportSecret(trimmedSecret);
      skipNextSecretLoadRef.current = true;
      setSecret(trimmedSecret);
      setFilter('open');
      setCases(dashboard.queue);
      setOperators(dashboard.operators);
      setPropertyVerificationItems(dashboard.propertyQueue);
      setModerationItems(dashboard.moderationQueue);
      setCaseNotes(Object.fromEntries(dashboard.queue.map((supportCase) => [supportCase.id, supportCase.statusNote ?? ''])));
      syncPropertyVerificationFormState(dashboard.propertyQueue);
      showToast('Soporte interno', 'Acceso interno habilitado en este navegador.', 'success');
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos validar el secreto interno.';
      setError(nextError);
      showToast('Soporte interno', nextError, 'error');
    } finally {
      setSavingSecret(false);
      setLoading(false);
    }
  };

  const clearSecret = () => {
    clearInternalSupportSecret();
    setSecret('');
    setSecretDraft('');
    setCases([]);
    setPropertyVerificationItems([]);
    setModerationItems([]);
    setOperators([]);
    setError(null);
    setOperatorError(null);
  };

  const updateOperatorAccess = async ({ email, enabled, operatorKey }: { email: string; enabled: boolean; operatorKey: string }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setOperatorError('Ingresá un email para asignar el acceso interno.');
      return;
    }

    setSavingOperatorKey(operatorKey);
    setOperatorError(null);

    try {
      const response = await apiJson<InternalOperatorUpdateResponse>('/api/internal/operators/access', {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': secret,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          enabled,
        }),
      });

      setOperators((currentOperators) => {
        const nextOperators = currentOperators.filter((operator) => operator.id !== response.user.id);

        if (response.user.isInternalOperator) {
          nextOperators.push(response.user);
        }

        return sortInternalOperators(nextOperators);
      });

      if (enabled) {
        setOperatorEmailDraft('');
      }

      showToast(
        'Soporte interno',
        enabled
          ? `${response.user.email} ahora tiene acceso interno.`
          : `${response.user.email} ya no tiene acceso interno.`,
        'success',
      );
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos actualizar ese acceso interno.';
      setOperatorError(nextError);
      showToast('Soporte interno', nextError, 'error');
    } finally {
      setSavingOperatorKey(null);
    }
  };

  const updateCaseStatus = async (supportCase: InternalSupportCase, status: InternalSupportStatus) => {
    setSavingCaseId(supportCase.id);
    setError(null);

    try {
      const response = await apiJson<InternalSupportReviewResponse>(`/api/internal/support/cases/${supportCase.id}/review`, {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': secret,
        },
        body: JSON.stringify({
          status,
          statusNote: caseNotes[supportCase.id]?.trim() || undefined,
          reviewedBy: reviewerName,
        }),
      });

      setCases((currentCases) => currentCases
        .map((currentCase) => (currentCase.id === supportCase.id ? response.case : currentCase))
        .filter((currentCase) => !(filter === 'open' && currentCase.status === 'resolved')));
      setCaseNotes((currentNotes) => ({
        ...currentNotes,
        [supportCase.id]: response.case.statusNote ?? '',
      }));
      showToast('Soporte interno', `Caso actualizado a ${response.case.statusLabel.toLowerCase()}.`, 'success');
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos actualizar el caso.';
      setError(nextError);
      showToast('Soporte interno', nextError, 'error');
    } finally {
      setSavingCaseId(null);
    }
  };

  const updatePropertyVerification = async (item: InternalPropertyVerificationItem, action: PropertyVerificationReviewAction) => {
    setSavingPropertyVerificationKey(`${item.propertyId}:${action}`);
    setError(null);

    try {
      const selectedReason = propertyTriggerReasons[item.propertyId] ?? item.onsiteTriggerReason ?? 'address_change';
      const response = await apiJson<InternalPropertyVerificationReviewResponse>(`/api/internal/properties/${item.propertyId}/verification/review`, {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': secret,
        },
        body: JSON.stringify({
          action,
          notes: propertyVerificationNotes[item.propertyId]?.trim() || undefined,
          triggerReason: action === 'mark-reverification-pending' ? selectedReason : undefined,
        }),
      });

      const nextItems = await loadPropertyVerificationQueue(secret);
      setPropertyVerificationItems(nextItems);
      syncPropertyVerificationFormState(nextItems);
      showToast('Soporte interno', getPropertyVerificationActionLabel(response.action), 'success');
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos actualizar esa revisión de propiedad.';
      setError(nextError);
      showToast('Soporte interno', nextError, 'error');
    } finally {
      setSavingPropertyVerificationKey(null);
    }
  };

  const openPropertyVerificationByPropertyId = async (propertyId: string) => {
    try {
      const existingItem = propertyVerificationItemsById.get(propertyId);

      if (existingItem) {
        focusPropertyVerificationCard(propertyId);
        return existingItem;
      }

      const nextItem = await loadPropertyVerificationQueueItem(secret, propertyId);

      if (!nextItem) {
        showToast('Soporte interno', 'Esa propiedad no tiene revisión de verificación disponible por ahora.', 'warning');
        return null;
      }

      upsertPropertyVerificationItems([nextItem]);
      focusPropertyVerificationCard(propertyId);
      return nextItem;
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos abrir la revisión de esa propiedad.';
      setError(nextError);
      showToast('Soporte interno', nextError, 'error');
      return null;
    }
  };

  const markReportPropertyForReverification = async (report: InternalModerationItem) => {
    if (!report.property?.id) {
      return;
    }

    setSavingPropertyVerificationKey(`${report.property.id}:report`);
    setError(null);

    try {
      const propertyItem = await openPropertyVerificationByPropertyId(report.property.id);

      if (!propertyItem?.onsiteLastValidatedAt) {
        showToast('Soporte interno', 'Esa propiedad no tiene una verificación presencial previa para actualizar.', 'warning');
        return;
      }

      await apiJson<InternalPropertyVerificationReviewResponse>(`/api/internal/properties/${report.property.id}/verification/review`, {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': secret,
        },
        body: JSON.stringify({
          action: 'mark-reverification-pending',
          notes: report.description || `Reporte relevante: ${report.reasonLabel}.`,
          triggerReason: 'relevant_report',
        }),
      });

      const nextItems = await loadPropertyVerificationQueue(secret);
      setPropertyVerificationItems(nextItems);
      syncPropertyVerificationFormState(nextItems);
      focusPropertyVerificationCard(report.property.id);
      showToast('Soporte interno', 'La propiedad quedó marcada para reverificación por reporte relevante.', 'success');
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos marcar la reverificación desde este reporte.';
      setError(nextError);
      showToast('Soporte interno', nextError, 'error');
    } finally {
      setSavingPropertyVerificationKey(null);
    }
  };

  const propertyVerificationSummary = {
    documentsPending: propertyVerificationItems.filter((item) => item.pendingDocumentsCount > 0).length,
    onsiteReviewPending: propertyVerificationItems.filter((item) => item.onsiteOperationalStatus === 'requires_review').length,
    reverificationPending: propertyVerificationItems.filter((item) => item.onsiteNeedsRefresh).length,
  };
  const moderationSummary = {
    pending: moderationItems.filter((item) => item.status === 'pending').length,
    withProperty: moderationItems.filter((item) => Boolean(item.property?.id)).length,
    severe: moderationItems.filter((item) => item.severity === 'severe').length,
  };

  if (!secret) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card
            variant="elevated"
            padding="lg"
            className="border-slate-200/90 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]"
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-brand/80">Operaciones internas</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Cola interna de soporte</h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  Abrí esta vista con el secreto interno para revisar casos contextualizados, mover estados y dejar una nota operativa clara sin salir de la app.
                </p>
              </div>

              <NoticeBanner
                tone="info"
                heading="Acceso interno por secreto"
                description="El secreto se guarda solo en este navegador. Si vence o cambia, podés reemplazarlo sin afectar otros flujos de la cuenta."
              />

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Input
                  label="Secreto interno"
                  type="password"
                  value={secretDraft}
                  onChange={(event) => setSecretDraft(event.target.value)}
                  placeholder="Pegá el secreto de operaciones"
                  helperText="Se envía como x-internal-ops-secret para abrir la cola privada."
                />
                <Button
                  type="button"
                  onClick={() => void persistSecret()}
                  loading={savingSecret}
                  loadingLabel="Validando..."
                  size="lg"
                >
                  Entrar a soporte
                </Button>
              </div>

              {error ? <NoticeBanner tone="error" heading={error} /> : null}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Cargando soporte interno..."
        description="Estamos armando la cola con el estado actual, el contexto operativo y las notas del último seguimiento."
      />
    );
  }

  if (error && cases.length === 0) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <ErrorState
            title="No pudimos abrir la cola interna"
            description={error}
            onRetry={() => setReloadKey((currentValue) => currentValue + 1)}
            onDismiss={clearSecret}
            dismissLabel="Borrar secreto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-slate-200/90 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.25)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-brand/80">Operaciones internas</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Soporte contextual con seguimiento operativo</h1>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                Acá ves cada caso con usuario, operación, publicación, conversación y timestamps vinculados. El objetivo es mover rápido el estado correcto, no reconstruir contexto a mano.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => setReloadKey((currentValue) => currentValue + 1)}>
                Actualizar
              </Button>
              <Button type="button" variant="outline" onClick={clearSecret}>
                Cambiar secreto
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  filter === option.value
                    ? 'border-brand/20 bg-brand/10 text-brand'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {error ? <NoticeBanner tone="error" heading={error} /> : null}

        <Card variant="elevated" padding="lg" className="border-slate-200/90 bg-white/96">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Permisos internos</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Gestionar operadores</h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  Asigná o revocá acceso interno por email sin tocar la base manualmente. El permiso habilita moderación, verificación y soporte, pero igual sigue pidiendo secreto operativo en cada navegador.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" size="md">{operators.length} con acceso</Badge>
                {currentUserId ? <Badge variant="brand" size="md">Tu sesión validada</Badge> : null}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <Input
                label="Email del operador"
                value={operatorEmailDraft}
                onChange={(event) => setOperatorEmailDraft(event.target.value)}
                placeholder="persona@alquilerreal.com"
                helperText="Buscamos la cuenta existente por email y activamos o revocamos el permiso interno."
              />
              <Button
                type="button"
                onClick={() => void updateOperatorAccess({
                  email: operatorEmailDraft,
                  enabled: true,
                  operatorKey: `grant:${operatorEmailDraft.trim().toLowerCase() || 'draft'}`,
                })}
                loading={savingOperatorKey?.startsWith('grant:')}
                loadingLabel="Actualizando..."
              >
                Dar acceso interno
              </Button>
            </div>

            {operatorError ? <NoticeBanner tone="error" heading={operatorError} /> : null}

            {operators.length === 0 ? (
              <NoticeBanner
                tone="info"
                heading="Todavía no hay operadores internos"
                description="Cuando actives el primer acceso, va a aparecer acá con su email y el botón para revocarlo si cambia el equipo." 
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {operators.map((operator) => {
                  const isCurrentOperator = currentUserId === operator.id;
                  const isSavingOperator = savingOperatorKey === operator.id;

                  return (
                    <div key={operator.id} className="rounded-[24px] border border-slate-200/90 bg-slate-50/85 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">{operator.name}</p>
                          <p className="text-sm text-slate-600">{operator.email}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{formatLabel(operator.role) || 'Sin rol visible'}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {isCurrentOperator ? <Badge variant="brand" size="md">Tu sesión</Badge> : null}
                          <Badge variant="info" size="md">Operador</Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">Alta visible desde {formatDateTime(operator.createdAt)}</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void updateOperatorAccess({
                            email: operator.email,
                            enabled: false,
                            operatorKey: operator.id,
                          })}
                          disabled={isCurrentOperator}
                          loading={isSavingOperator}
                          loadingLabel="Revocando..."
                        >
                          Revocar acceso
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="border-slate-200/90 bg-white/96">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Verificación de propiedades</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Revisión documental y presencial</h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  Esta cola junta documentación privada, cierres presenciales pendientes y publicaciones cuya verificación necesita actualizarse sin borrar el historial ni esconder el aviso automáticamente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" size="md">{propertyVerificationSummary.documentsPending} con documentos</Badge>
                <Badge variant="brand" size="md">{propertyVerificationSummary.onsiteReviewPending} para revisión presencial</Badge>
                <Badge variant="warning" size="md">{propertyVerificationSummary.reverificationPending} para actualizar</Badge>
              </div>
            </div>

            {propertyVerificationItems.length === 0 ? (
              <NoticeBanner
                tone="info"
                heading="No hay propiedades en revisión ahora"
                description="Cuando entren documentos pendientes, una visita quede para revisión interna o una verificación presencial necesite actualizarse, va a aparecer en esta cola."
              />
            ) : (
              <div className="grid gap-4">
                {propertyVerificationItems.map((item) => {
                  const isSavingProperty = typeof savingPropertyVerificationKey === 'string' && savingPropertyVerificationKey.startsWith(`${item.propertyId}:`);
                  const triggerReasonOptions = item.onsiteMaintenanceStatus === 'requires_reverification'
                    ? PROPERTY_REVERIFICATION_REASON_OPTIONS
                    : PROPERTY_REVERIFICATION_REASON_OPTIONS.filter((option) => option.value !== 'expiration');
                  const canMarkReverification = Boolean(item.onsiteLastValidatedAt) && item.onsiteMaintenanceStatus !== 'reverification_pending';

                  return (
                    <div
                      key={item.propertyId}
                      id={`property-verification-${item.propertyId}`}
                      ref={(node) => {
                        propertyVerificationRefs.current[item.propertyId] = node;
                      }}
                      className={cn(
                        'scroll-mt-24 rounded-[28px] border border-slate-200/90 bg-slate-50/70 p-5 transition-colors',
                        focusedPropertyVerificationId === item.propertyId && 'border-brand/40 bg-brand/5',
                      )}
                    >
                      <div className="space-y-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.pendingDocumentsCount > 0 ? <Badge variant="info" size="md">{item.pendingDocumentsCount} documento(s) pendiente(s)</Badge> : null}
                              {item.onsiteOperationalLabel ? <Badge variant="brand" size="md">{item.onsiteOperationalLabel}</Badge> : null}
                              {item.onsiteMaintenanceLabel ? (
                                <Badge variant={item.onsiteNeedsRefresh ? 'warning' : 'success'} size="md">{item.onsiteMaintenanceLabel}</Badge>
                              ) : null}
                            </div>

                            <div>
                              <h3 className="text-xl font-semibold tracking-tight text-slate-950">{item.propertyTitle || 'Propiedad sin título visible'}</h3>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {item.hostName || 'Anfitrión sin nombre'}
                                {item.hostId ? ` · ${item.hostId}` : ''}
                              </p>
                            </div>

                            {item.onsiteMaintenanceDescription ? (
                              <p className="max-w-3xl text-sm leading-7 text-slate-700">{item.onsiteMaintenanceDescription}</p>
                            ) : item.onsiteOperationalDescription ? (
                              <p className="max-w-3xl text-sm leading-7 text-slate-700">{item.onsiteOperationalDescription}</p>
                            ) : (
                              <p className="max-w-3xl text-sm leading-7 text-slate-500">La propiedad quedó en la cola porque todavía hay señales de verificación para revisar.</p>
                            )}
                          </div>

                          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-600 lg:min-w-[20rem]">
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Resumen operativo</p>
                            <div className="mt-3 space-y-2">
                              <p><span className="font-semibold text-slate-900">Última validación:</span> {formatDateTime(item.onsiteLastValidatedAt)}</p>
                              <p><span className="font-semibold text-slate-900">Actualizar antes de:</span> {formatDateTime(item.onsiteExpiresAt)}</p>
                              <p><span className="font-semibold text-slate-900">Visita registrada:</span> {formatDateTime(item.onsiteAppointmentDate)}</p>
                              {item.onsiteVerifierName ? <p><span className="font-semibold text-slate-900">Verificador:</span> {item.onsiteVerifierName}</p> : null}
                              {item.onsiteTriggerReason ? <p><span className="font-semibold text-slate-900">Motivo:</span> {getPropertyTriggerReasonLabel(item.onsiteTriggerReason)}</p> : null}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <InfoBlock label="Documentos pendientes" value={String(item.pendingDocumentsCount)} />
                          <InfoBlock label="Estado presencial" value={item.onsiteOperationalLabel || item.onsiteMaintenanceLabel || 'Sin estado presencial'} />
                          <InfoBlock label="Última validación" value={formatDateTime(item.onsiteLastValidatedAt)} />
                          <InfoBlock label="Próxima actualización" value={formatDateTime(item.onsiteExpiresAt)} />
                        </div>

                        {item.documents.length > 0 ? (
                          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4">
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Documentos cargados</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {item.documents.map((document) => (
                                <a
                                  key={document.id}
                                  href={document.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
                                >
                                  <p className="font-semibold text-slate-950">{document.originalName || 'Documento sin nombre'}</p>
                                  <p className="mt-1 text-xs text-slate-500">{formatLabel(document.verificationStatus) || 'Sin estado'} · {formatDateTime(document.createdAt)}</p>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
                          <div className="space-y-4">
                            {item.pendingDocumentsCount > 0 ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => void updatePropertyVerification(item, 'approve-documents')}
                                  disabled={isSavingProperty}
                                  className="rounded-[22px] border border-slate-200/90 bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <p className="text-sm font-semibold">Aprobar documentación</p>
                                  <p className="mt-2 text-xs leading-5 text-slate-500">Confirma los respaldos privados y dejá trazabilidad interna en el mismo paso.</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void updatePropertyVerification(item, 'reject-documents')}
                                  disabled={isSavingProperty}
                                  className="rounded-[22px] border border-slate-200/90 bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <p className="text-sm font-semibold">Rechazar documentación</p>
                                  <p className="mt-2 text-xs leading-5 text-slate-500">Usalo cuando el respaldo no alcance o necesite una nueva carga antes de seguir.</p>
                                </button>
                              </div>
                            ) : null}

                            {item.onsiteOperationalStatus === 'requires_review' ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => void updatePropertyVerification(item, 'complete-manual-review')}
                                  disabled={isSavingProperty}
                                  className="rounded-[22px] border border-slate-200/90 bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <p className="text-sm font-semibold">Aprobar visita presencial</p>
                                  <p className="mt-2 text-xs leading-5 text-slate-500">Cierra la revisión manual y vuelve a dejar la validación presencial como vigente.</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void updatePropertyVerification(item, 'clear-manual-review')}
                                  disabled={isSavingProperty}
                                  className="rounded-[22px] border border-slate-200/90 bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <p className="text-sm font-semibold">Cerrar sin dejarla vigente</p>
                                  <p className="mt-2 text-xs leading-5 text-slate-500">Conserva el historial de la visita, pero evita que siga contando como verificación presencial actual.</p>
                                </button>
                              </div>
                            ) : null}

                            {canMarkReverification ? (
                              <div className="rounded-[24px] border border-slate-200/90 bg-white/90 px-4 py-4">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">Registrar reverificación pendiente</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                      Usalo cuando haya un cambio operativo importante o cuando quieras formalizar que la visita anterior ya necesita actualizarse.
                                    </p>
                                  </div>
                                  <label className="block text-sm font-medium text-slate-700">
                                    Motivo operativo
                                    <select
                                      aria-label={`Motivo operativo ${item.propertyId}`}
                                      value={propertyTriggerReasons[item.propertyId] ?? item.onsiteTriggerReason ?? 'address_change'}
                                      onChange={(event) => setPropertyTriggerReasons((currentReasons) => ({
                                        ...currentReasons,
                                        [item.propertyId]: event.target.value as PropertyVerificationTriggerReason,
                                      }))}
                                      className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand/35"
                                    >
                                      {triggerReasonOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <Button
                                    type="button"
                                    onClick={() => void updatePropertyVerification(item, 'mark-reverification-pending')}
                                    loading={savingPropertyVerificationKey === `${item.propertyId}:mark-reverification-pending`}
                                    loadingLabel="Guardando..."
                                  >
                                    {item.onsiteNeedsRefresh ? 'Formalizar reverificación pendiente' : 'Marcar reverificación pendiente'}
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3 rounded-[24px] border border-slate-200/90 bg-white/90 px-4 py-4">
                            <label htmlFor={`property-verification-note-${item.propertyId}`} className="text-sm font-semibold text-slate-900">
                              Nota operativa
                            </label>
                            <textarea
                              id={`property-verification-note-${item.propertyId}`}
                              value={propertyVerificationNotes[item.propertyId] ?? ''}
                              onChange={(event) => setPropertyVerificationNotes((currentNotes) => ({
                                ...currentNotes,
                                [item.propertyId]: event.target.value.slice(0, 500),
                              }))}
                              rows={5}
                              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/35"
                              placeholder="Dejá un resumen claro de qué se aprobó, qué faltó o por qué conviene actualizar la visita presencial."
                            />
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                              <span>Operador: {reviewerName}</span>
                              <span>{(propertyVerificationNotes[item.propertyId] ?? '').length}/500</span>
                            </div>
                            {isSavingProperty ? <NoticeBanner tone="info" heading="Guardando revisión de propiedad..." /> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="border-slate-200/90 bg-white/96">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Reportes internos</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Moderación conectada con revisión de propiedades</h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  Los reportes con propiedad vinculada pueden abrir la revisión de verificación en el mismo panel. Si el reporte ya justifica una actualización presencial, también podés marcar la reverificación desde acá.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" size="md">{moderationSummary.pending} pendientes</Badge>
                <Badge variant="brand" size="md">{moderationSummary.withProperty} con propiedad</Badge>
                <Badge variant="warning" size="md">{moderationSummary.severe} severos</Badge>
              </div>
            </div>

            {moderationItems.length === 0 ? (
              <NoticeBanner
                tone="info"
                heading="No hay reportes internos cargados ahora"
                description="Cuando entre un reporte pendiente, va a aparecer acá con el usuario, la propiedad vinculada y el acceso directo a la revisión de verificación si corresponde."
              />
            ) : (
              <div className="grid gap-4">
                {moderationItems.map((report) => {
                  const linkedPropertyVerificationItem = report.property?.id ? propertyVerificationItemsById.get(report.property.id) ?? null : null;
                  const canFlagReportForReverification = Boolean(report.property?.id && linkedPropertyVerificationItem?.onsiteLastValidatedAt);
                  const isSavingReportProperty = savingPropertyVerificationKey === `${report.property?.id}:report`;

                  return (
                    <div key={report.id} className="rounded-[28px] border border-slate-200/90 bg-slate-50/70 p-5">
                      <div className="space-y-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={report.status === 'pending' ? 'warning' : 'neutral'} size="md">{formatLabel(report.status) || report.status}</Badge>
                              <Badge variant={report.severity === 'severe' ? 'warning' : 'info'} size="md">{formatLabel(report.severity) || report.severity}</Badge>
                              <Badge variant="neutral" size="md">{report.reasonLabel}</Badge>
                            </div>

                            <div>
                              <h3 className="text-xl font-semibold tracking-tight text-slate-950">{report.property?.title || report.user.name}</h3>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {report.property ? `${report.user.name} · ${report.property.id}` : report.user.name}
                              </p>
                            </div>

                            <p className="max-w-3xl text-sm leading-7 text-slate-700">
                              {report.description || 'El reporte no dejó una descripción adicional, pero quedó en cola por el motivo cargado.'}
                            </p>
                          </div>

                          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-600 lg:min-w-[20rem]">
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Señales del reporte</p>
                            <div className="mt-3 space-y-2">
                              <p><span className="font-semibold text-slate-900">Ingresó:</span> {formatDateTime(report.createdAt)}</p>
                              <p><span className="font-semibold text-slate-900">Peso del reporte:</span> {report.reporterWeight.toFixed(2)}</p>
                              <p><span className="font-semibold text-slate-900">Reportes recientes:</span> {report.history.recentReportsCount}</p>
                              <p><span className="font-semibold text-slate-900">Confirmados:</span> {report.history.confirmedReportsCount}</p>
                              <p><span className="font-semibold text-slate-900">Riesgo:</span> {formatLabel(report.risk.level) || report.risk.level}</p>
                            </div>
                          </div>
                        </div>

                        {report.property ? (
                          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Revisión de propiedad vinculada</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">
                                  {linkedPropertyVerificationItem?.onsiteMaintenanceLabel
                                    || linkedPropertyVerificationItem?.onsiteOperationalLabel
                                    || 'Todavía no está cargada en esta vista'}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {linkedPropertyVerificationItem?.onsiteMaintenanceDescription
                                    || linkedPropertyVerificationItem?.onsiteOperationalDescription
                                    || 'Podés abrir la revisión de la propiedad con este propertyId ya resuelto, sin hacer búsqueda manual.'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => void openPropertyVerificationByPropertyId(report.property!.id)}
                                >
                                  {linkedPropertyVerificationItem ? 'Abrir revisión de propiedad' : 'Cargar revisión de propiedad'}
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => void markReportPropertyForReverification(report)}
                                  disabled={!report.property?.id}
                                  loading={isSavingReportProperty}
                                  loadingLabel="Guardando..."
                                >
                                  Marcar reverificación por reporte
                                </Button>
                              </div>
                            </div>
                            {!canFlagReportForReverification ? (
                              <p className="mt-3 text-xs leading-5 text-slate-500">
                                Si la propiedad tiene una validación presencial previa, este botón la va a cargar y, cuando corresponda, la va a marcar con motivo "Reportes relevantes".
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="border-slate-200/90 bg-white/96">
          <OperationalReviewPolicyCard title="Politica operativa de conflictos y revisiones" />
        </Card>

        {cases.length === 0 ? (
          <EmptyState
            tone="soft"
            icon={<Icons.ShieldAlert className="h-10 w-10 text-brand" />}
            eyebrow="Sin casos"
            title="No hay casos para este filtro"
            description="Cuando entre un pedido contextual o cambies el filtro, la cola se actualiza acá con el último estado y la información operativa disponible."
          />
        ) : (
          <section className="grid gap-4">
            {cases.map((supportCase) => {
              const timestampSummary = buildTimestampSummary(supportCase.timestamps);
              const isSaving = savingCaseId === supportCase.id;
              const linkedPropertyVerificationItem = supportCase.propertyId ? propertyVerificationItemsById.get(supportCase.propertyId) ?? null : null;
              const reviewHistory = Array.isArray(supportCase.reviewHistory) ? supportCase.reviewHistory : [];
              const recommendedNextStatus = RECOMMENDED_NEXT_STATUS[supportCase.status];
              const orderedStatusActions = getOrderedStatusActions(supportCase.status);

              return (
                <Card key={supportCase.id} variant="elevated" padding="lg" className="border-slate-200/90 bg-white/96">
                  <div className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={STATUS_VARIANTS[supportCase.status]} size="md">{supportCase.statusLabel}</Badge>
                          <Badge variant="neutral" size="md">{supportCase.entryPointLabel}</Badge>
                          <Badge variant="neutral" size="md">{supportCase.categoryLabel}</Badge>
                          {supportCase.operation.requestMode ? <Badge variant="brand" size="md">{formatLabel(supportCase.operation.requestMode)}</Badge> : null}
                        </div>

                        <div>
                          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                            {supportCase.property?.title || (typeof supportCase.contextSnapshot.propertyTitle === 'string' ? supportCase.contextSnapshot.propertyTitle : null) || 'Caso sin publicación vinculada'}
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {supportCase.user.name} {supportCase.user.role ? `· ${formatLabel(supportCase.user.role)}` : ''}
                          </p>
                        </div>

                        {supportCase.description ? (
                          <p className="max-w-3xl text-sm leading-7 text-slate-700">{supportCase.description}</p>
                        ) : (
                          <p className="text-sm leading-7 text-slate-500">El usuario no dejó aclaración adicional. El caso quedó abierto solo con contexto automático.</p>
                        )}
                      </div>

                      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 text-sm text-slate-600 lg:min-w-[19rem]">
                        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Último movimiento</p>
                        <p className="mt-3 font-semibold text-slate-900">{supportCase.statusLabel}</p>
                        <p className="mt-1">{formatDateTime(supportCase.lastStatusAt)}</p>
                        {supportCase.lastStatusBy ? <p className="mt-1 text-xs text-slate-500">Actualizó: {supportCase.lastStatusBy}</p> : null}
                        {supportCase.statusNote ? (
                          <p className="mt-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600">{supportCase.statusNote}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoBlock label="Operación" value={supportCase.operation.operationType ? formatLabel(supportCase.operation.operationType) : 'Sin operación explícita'} />
                      <InfoBlock label="ID vinculados" value={[supportCase.bookingId, supportCase.conversationId, supportCase.propertyId].filter(Boolean).join(' · ') || 'Sin IDs extra'} />
                      <InfoBlock label="Estado operativo" value={supportCase.operation.operationStatus ? formatLabel(supportCase.operation.operationStatus) : supportCase.operation.depositStatus ? formatLabel(supportCase.operation.depositStatus) : 'Sin estado adicional'} />
                      <InfoBlock label="Creado" value={formatDateTime(supportCase.createdAt)} />
                    </div>

                    {timestampSummary.length > 0 ? (
                      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Timestamps relevantes</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {timestampSummary.map((item) => (
                            <span key={`${supportCase.id}-${item}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {reviewHistory.length > 0 ? (
                      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Historial de revision</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">Cada movimiento deja decision, operador y timestamp dentro del caso.</p>
                          </div>
                          <Badge variant="neutral" size="md">{reviewHistory.length} movimiento(s)</Badge>
                        </div>

                        <div className="mt-4 space-y-3">
                          {reviewHistory.map((entry) => (
                            <div key={entry.id} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1.5">
                                  <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                                  <p className="text-sm leading-6 text-slate-600">{entry.description}</p>
                                </div>
                                <span className={cn(
                                  'inline-flex rounded-full border px-3 py-1 text-[0.72rem] font-semibold',
                                  entry.actorType === 'internal_operator'
                                    ? 'border-brand/20 bg-brand/8 text-brand'
                                    : 'border-slate-200 bg-slate-50 text-slate-600',
                                )}>
                                  {entry.decision}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                {formatDateTime(entry.createdAt)} · {getSupportReviewActorLabel(entry)}
                              </p>
                              {entry.note ? (
                                <p className="mt-3 rounded-[16px] border border-slate-200/80 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-600">
                                  {entry.note}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {supportCase.propertyId ? (
                      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Revisión de propiedad vinculada</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {linkedPropertyVerificationItem?.onsiteMaintenanceLabel
                                || linkedPropertyVerificationItem?.onsiteOperationalLabel
                                || 'Sin revisión cargada en esta vista'}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {linkedPropertyVerificationItem?.onsiteMaintenanceDescription
                                || linkedPropertyVerificationItem?.onsiteOperationalDescription
                                || 'Podés abrir la revisión de esta propiedad sin salir del caso para ver si ya hay una visita, documentos o una actualización pendiente.'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void openPropertyVerificationByPropertyId(supportCase.propertyId!)}
                          >
                            {linkedPropertyVerificationItem ? 'Abrir revisión de propiedad' : 'Cargar revisión de propiedad'}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {orderedStatusActions.map((action) => {
                          const isCurrentStatus = supportCase.status === action.value;
                          const isRecommendedNextStep = action.value === recommendedNextStatus && !isCurrentStatus;

                          return (
                          <button
                            key={`${supportCase.id}-${action.value}`}
                            type="button"
                            onClick={() => void updateCaseStatus(supportCase, action.value)}
                            disabled={isSaving}
                            className={cn(
                              'rounded-[22px] border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                              isRecommendedNextStep
                                ? 'border-brand bg-brand text-white shadow-[0_22px_44px_-32px_rgba(67,56,202,0.45)] hover:bg-brand-dark'
                                : isCurrentStatus
                                  ? 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                  : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{action.label}</p>
                              {isRecommendedNextStep ? (
                                <span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                  Siguiente paso
                                </span>
                              ) : isCurrentStatus ? (
                                <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  Estado actual
                                </span>
                              ) : null}
                            </div>
                            <p className={cn(
                              'mt-2 text-xs leading-5',
                              isRecommendedNextStep ? 'text-white/88' : 'text-slate-500',
                            )}>
                              {action.helper}
                            </p>
                          </button>
                          );
                        })}
                      </div>

                      <div className="space-y-3 rounded-[24px] border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                        <label htmlFor={`support-case-note-${supportCase.id}`} className="text-sm font-semibold text-slate-900">
                          Nota operativa
                        </label>
                        <textarea
                          id={`support-case-note-${supportCase.id}`}
                          value={caseNotes[supportCase.id] ?? ''}
                          onChange={(event) => setCaseNotes((currentNotes) => ({
                            ...currentNotes,
                            [supportCase.id]: event.target.value.slice(0, 500),
                          }))}
                          rows={5}
                          className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/35"
                          placeholder="Dejá una nota clara sobre qué falta, qué ya se revisó o qué respuesta esperás."
                        />
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>Operador: {reviewerName}</span>
                          <span>{(caseNotes[supportCase.id] ?? '').length}/500</span>
                        </div>
                        {isSaving ? <NoticeBanner tone="info" heading="Guardando cambio de estado..." /> : null}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
    <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{value}</p>
  </div>
);

export default InternalSupportQueue;