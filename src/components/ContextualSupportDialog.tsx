import React, { useEffect, useMemo, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import {
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_CASE_STATUSES,
  SUPPORT_STATUS_COPY,
  type SupportCaseCategory,
  type SupportCaseStatus,
  type SupportEntryPoint,
} from '../lib/contextualSupport';
import { showToast } from '../lib/toast';
import {
  SUPPORT_OPERATION_REVIEW_DISCLAIMER,
  SUPPORT_OPERATION_REVIEW_SUPPORT,
} from '../lib/uxDisclaimers';
import { cn } from '../lib/utils';
import type { ReviewType } from '../types';
import { Icons } from './Icons';
import { ContextualDisclaimer } from './ui/ContextualDisclaimer';
import { Button, type ButtonProps } from './ui/Button';

type SupportCaseRecord = {
  id: string;
  entryPoint: SupportEntryPoint;
  category: SupportCaseCategory;
  description: string | null;
  status: SupportCaseStatus;
  statusNote: string | null;
  propertyId: string | null;
  bookingId: string | null;
  conversationId: string | null;
  reviewType: ReviewType | null;
  contextSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastStatusAt: string;
};

type SupportCasesResponse = {
  items: SupportCaseRecord[];
  context?: {
    propertyId: string | null;
    bookingId: string | null;
    conversationId: string | null;
    contextSnapshot?: Record<string, unknown>;
  };
};

type CreateSupportCaseResponse = {
  case: SupportCaseRecord;
  message: string;
};

type ContextualSupportDialogProps = {
  entryPoint: SupportEntryPoint;
  bookingId?: string | null;
  conversationId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  reviewType?: ReviewType | null;
  triggerLabel?: string;
  triggerVariant?: ButtonProps['variant'];
  triggerSize?: ButtonProps['size'];
  triggerClassName?: string;
  title?: string;
};

const STATUS_INDEX = new Map<SupportCaseStatus, number>(
  SUPPORT_CASE_STATUSES.map((status, index) => [status, index]),
);

const ENTRY_POINT_LABELS: Record<SupportEntryPoint, string> = {
  booking: 'esta reserva',
  conversation: 'esta conversacion',
  checkin: 'este ingreso',
  review: 'esta revision',
  publishing: 'esta publicacion',
};

const formatSupportDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

const buildSupportRequestPayload = ({
  entryPoint,
  bookingId,
  conversationId,
  propertyId,
  reviewType,
}: Pick<ContextualSupportDialogProps, 'entryPoint' | 'bookingId' | 'conversationId' | 'propertyId' | 'reviewType'>) => {
  const payload: Record<string, string> = {
    entryPoint,
  };

  if (bookingId) {
    payload.bookingId = bookingId;
  }

  if (conversationId) {
    payload.conversationId = conversationId;
  }

  if (propertyId) {
    payload.propertyId = propertyId;
  }

  if (reviewType) {
    payload.reviewType = reviewType;
  }

  return payload;
};

const getCaseContextSummary = (supportCase: SupportCaseRecord, propertyTitle?: string | null) => {
  const snapshot = supportCase.contextSnapshot ?? {};
  const resolvedPropertyTitle = typeof snapshot.propertyTitle === 'string' && snapshot.propertyTitle.trim()
    ? snapshot.propertyTitle
    : propertyTitle;
  const operationType = typeof snapshot.operationType === 'string' ? snapshot.operationType : null;
  const operationId = typeof snapshot.operationId === 'string' ? snapshot.operationId : null;

  return [
    resolvedPropertyTitle,
    operationType === 'booking' ? 'Operacion vinculada' : operationType === 'conversation' ? 'Conversacion vinculada' : null,
    operationId ? `ID ${operationId}` : null,
  ].filter(Boolean).join(' · ');
};

export const ContextualSupportDialog: React.FC<ContextualSupportDialogProps> = ({
  entryPoint,
  bookingId = null,
  conversationId = null,
  propertyId = null,
  propertyTitle = null,
  reviewType = null,
  triggerLabel = 'Necesito ayuda',
  triggerVariant = 'outline',
  triggerSize = 'sm',
  triggerClassName,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cases, setCases] = useState<SupportCaseRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SupportCaseCategory | null>(null);
  const [description, setDescription] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPayload = useMemo(() => buildSupportRequestPayload({
    entryPoint,
    bookingId,
    conversationId,
    propertyId,
    reviewType,
  }), [entryPoint, bookingId, conversationId, propertyId, reviewType]);

  const latestCase = cases[0] ?? null;
  const latestStatusIndex = latestCase ? STATUS_INDEX.get(latestCase.status) ?? -1 : -1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const loadCases = async () => {
      setLoadingCases(true);
      setError(null);

      try {
        const params = new URLSearchParams(requestPayload);
        const response = await apiJson<SupportCasesResponse>(`/api/support/cases?${params.toString()}`);
        if (!cancelled) {
          setCases(Array.isArray(response.items) ? response.items : []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'No pudimos cargar la ayuda contextual.');
        }
      } finally {
        if (!cancelled) {
          setLoadingCases(false);
        }
      }
    };

    void loadCases();

    return () => {
      cancelled = true;
    };
  }, [isOpen, requestPayload]);

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('Elegi el motivo para seguir.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiJson<CreateSupportCaseResponse>('/api/support/cases', {
        method: 'POST',
        body: JSON.stringify({
          ...requestPayload,
          category: selectedCategory,
          description: description.trim() || undefined,
        }),
      });

      setCases((currentCases) => [response.case, ...currentCases.filter((item) => item.id !== response.case.id)]);
      setSelectedCategory(null);
      setDescription('');
      showToast('Ayuda contextual', response.message, 'success');
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'No pudimos registrar tu pedido de ayuda.';
      setError(nextError);
      showToast('Ayuda contextual', nextError, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setIsOpen(true)}
        className={cn('rounded-full', triggerClassName)}
      >
        <Icons.MessageSquare className="h-4 w-4" />
        {triggerLabel}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_36px_88px_-46px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ayuda contextual</p>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  {title ?? `Necesito ayuda con ${ENTRY_POINT_LABELS[entryPoint]}`}
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Abrí ayuda sin salir de la operación. Tomamos el contexto disponible para revisar mejor qué pasó y cómo seguir.
                </p>
                {propertyTitle ? (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Contexto actual: {propertyTitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Cerrar ayuda contextual"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="space-y-6">
                <ContextualDisclaimer
                  eyebrow="Cómo revisamos esto"
                  compact
                  body={SUPPORT_OPERATION_REVIEW_DISCLAIMER}
                  supportingText={SUPPORT_OPERATION_REVIEW_SUPPORT}
                />

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Que paso</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SUPPORT_CATEGORY_OPTIONS.map((option) => {
                      const isSelected = selectedCategory === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedCategory(option.value)}
                          className={cn(
                            'rounded-[24px] border px-4 py-4 text-left transition-colors',
                            isSelected
                              ? 'border-brand bg-brand/8 text-slate-950 shadow-[0_18px_42px_-34px_rgba(55,48,163,0.45)] dark:border-brand/40 dark:bg-brand/10 dark:text-slate-50'
                              : 'border-slate-200/80 bg-slate-50/90 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900',
                          )}
                        >
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="contextual-support-description" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Aclaracion breve opcional
                  </label>
                  <textarea
                    id="contextual-support-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value.slice(0, 500))}
                    rows={4}
                    className="w-full rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-brand/40 dark:focus:bg-slate-900"
                    placeholder="Suma el detalle justo para revisar mejor lo que paso."
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Operamos con contexto real y revision humana. No prometemos resolucion inmediata ni cobertura total para cualquier escenario.
                  </p>
                </div>

                {error ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={handleClose}>
                    Cerrar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    loading={submitting}
                    loadingLabel="Enviando ayuda..."
                  >
                    Enviar pedido
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Seguimiento</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {latestCase
                          ? 'Este es el estado mas reciente que tenemos para este contexto.'
                          : 'Cuando abras un caso, vas a ver aca si fue recibido, revisado o cerrado.'}
                      </p>
                    </div>
                    {loadingCases ? <span className="text-xs font-medium text-slate-400">Cargando...</span> : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {SUPPORT_CASE_STATUSES.map((status, index) => {
                      const copy = SUPPORT_STATUS_COPY[status];
                      const isCompleted = latestStatusIndex >= 0 && index <= latestStatusIndex;
                      const isActive = latestCase?.status === status;

                      return (
                        <div
                          key={status}
                          className={cn(
                            'rounded-[22px] border px-4 py-3 transition-colors',
                            isActive
                              ? 'border-brand/30 bg-brand/8 dark:border-brand/40 dark:bg-brand/10'
                              : isCompleted
                                ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                              isActive
                                ? 'bg-brand text-white'
                                : isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                            )}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.label}</p>
                              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ultimo caso</p>

                  {latestCase ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                          {SUPPORT_CATEGORY_OPTIONS.find((option) => option.value === latestCase.category)?.label ?? 'Otro problema'}
                        </span>
                        <span className="inline-flex rounded-full border border-brand/20 bg-brand/8 px-3 py-1 text-xs font-semibold text-brand dark:border-brand/30 dark:bg-brand/10 dark:text-brand-light">
                          {SUPPORT_STATUS_COPY[latestCase.status].label}
                        </span>
                      </div>

                      {getCaseContextSummary(latestCase, propertyTitle) ? (
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {getCaseContextSummary(latestCase, propertyTitle)}
                        </p>
                      ) : null}

                      {latestCase.description ? (
                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{latestCase.description}</p>
                      ) : null}

                      {latestCase.statusNote ? (
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                          {latestCase.statusNote}
                        </div>
                      ) : null}

                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Ultima actualizacion: {formatSupportDate(latestCase.lastStatusAt) ?? 'sin fecha'}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Todavia no hay un caso cargado para este contexto. Si necesitás ayuda, elegi el motivo y dejalo registrado aca.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};