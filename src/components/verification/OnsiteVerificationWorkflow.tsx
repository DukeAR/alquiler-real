import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiJson } from '../../lib/apiConfig';
import type {
  OnsiteVerificationMaintenanceHistoryEntry,
  OnsiteVerificationMaintenanceReason,
  OnsiteVerificationMaintenanceStatus,
} from '../../lib/onsiteVerificationProtocol';
import { VERIFICATION_PRIVACY_NOTICES } from '../../lib/privacyPolicy';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';
import { Button } from '../ui/Button';

type OnsiteOperationalStatus = 'pending_schedule' | 'scheduled' | 'in_progress' | 'approved' | 'requires_review' | 'not_completed';

type OnsiteChecklistState = {
  propertyExists: boolean;
  locationMatches: boolean;
  realAccessAvailable: boolean;
  hostLinkedToProperty: boolean;
};

type OnsiteEvidenceState = {
  photoCount: number;
  geolocation: string | null;
  timestamp: string | null;
  notes: string | null;
};

type OnsiteHistoryEntry = {
  id: string;
  date: string;
  status: OnsiteOperationalStatus;
  actorLabel: string;
  verifierName: string | null;
  notes: string | null;
};

type OnsiteEvidencePhoto = {
  id: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  originalName: string;
  createdAt: string;
};

type OnsiteVerificationStatusResponse = {
  propertyId: string;
  propertyTitle: string;
  orderId: string | null;
  requestedAt: string | null;
  updatedAt: string | null;
  status: OnsiteOperationalStatus;
  statusLabel: string;
  statusDescription: string;
  requestSource: 'dashboard' | 'listing' | 'onsite-page' | 'unknown';
  coordinationMode: 'manual';
  appointmentDate: string | null;
  coordinationNotes: string | null;
  verifierName: string | null;
  checklist: OnsiteChecklistState;
  evidence: OnsiteEvidenceState;
  evidencePhotos: OnsiteEvidencePhoto[];
  history: OnsiteHistoryEntry[];
  maintenanceStatus: OnsiteVerificationMaintenanceStatus | null;
  maintenanceLabel: string | null;
  maintenanceDescription: string | null;
  lastValidatedAt: string | null;
  expiresAt: string | null;
  maintenanceTriggerReason: OnsiteVerificationMaintenanceReason | null;
  maintenanceHistory: OnsiteVerificationMaintenanceHistoryEntry[];
};

type OnsiteVerificationWorkflowProps = {
  onComplete: () => Promise<void> | void;
  orderId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
};

const ONSITE_APPOINTMENT_OPTIONS = [
  '2026-05-12T10:30:00.000Z',
  '2026-05-12T12:00:00.000Z',
  '2026-05-13T09:30:00.000Z',
  '2026-05-13T15:30:00.000Z',
] as const;

const createEmptyChecklist = (): OnsiteChecklistState => ({
  propertyExists: false,
  locationMatches: false,
  realAccessAvailable: false,
  hostLinkedToProperty: false,
});

const CHECKLIST_ITEMS: Array<{ key: keyof OnsiteChecklistState; label: string; help: string }> = [
  {
    key: 'propertyExists',
    label: 'La propiedad existe',
    help: 'Confirmar que el inmueble visitado corresponde a una unidad real.',
  },
  {
    key: 'locationMatches',
    label: 'La ubicacion coincide',
    help: 'Verificar que la referencia de ubicacion coincide con la publicada.',
  },
  {
    key: 'realAccessAvailable',
    label: 'Hay acceso real disponible',
    help: 'Registrar que se pudo ingresar o demostrar acceso operativo.',
  },
  {
    key: 'hostLinkedToProperty',
    label: 'El anfitrion esta vinculado a la propiedad',
    help: 'Dejar constancia de la relacion operativa entre anfitrion y aviso.',
  },
] as const;

const formatDateTime = (value: string | null) => {
  if (!value || Number.isNaN(Date.parse(value))) {
    return 'Pendiente';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getHistoryStatusLabel = (status: OnsiteOperationalStatus) => {
  switch (status) {
    case 'pending_schedule':
      return 'Pendiente de agenda';
    case 'scheduled':
      return 'Visita programada';
    case 'in_progress':
      return 'Validacion en proceso';
    case 'approved':
      return 'Aprobada';
    case 'requires_review':
      return 'Requiere revision';
    case 'not_completed':
      return 'No completada';
  }
};

const getMaintenanceHistoryStatusLabel = (status: OnsiteVerificationMaintenanceStatus) => {
  switch (status) {
    case 'verified':
      return 'Verificada';
    case 'requires_reverification':
      return 'Requiere reverificación';
    case 'reverification_pending':
      return 'Reverificación pendiente';
  }
};

const getMaintenanceReasonLabel = (reason: OnsiteVerificationMaintenanceReason | null) => {
  switch (reason) {
    case 'expiration':
      return 'Vencimiento temporal';
    case 'address_change':
      return 'Cambio importante de dirección';
    case 'relevant_report':
      return 'Reportes relevantes';
    case 'detected_inconsistency':
      return 'Inconsistencias detectadas';
    default:
      return null;
  }
};

export const OnsiteVerificationWorkflow: React.FC<OnsiteVerificationWorkflowProps> = ({
  onComplete,
  orderId = null,
  propertyId = null,
  propertyTitle = null,
}) => {
  const [statusData, setStatusData] = useState<OnsiteVerificationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [coordinationNotes, setCoordinationNotes] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [geolocation, setGeolocation] = useState('');
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString());
  const [checklist, setChecklist] = useState<OnsiteChecklistState>(() => createEmptyChecklist());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const resolvedPropertyTitle = statusData?.propertyTitle || propertyTitle || 'Tu propiedad';
  const canScheduleVisit = statusData?.status === 'pending_schedule' || statusData?.status === 'not_completed' || statusData === null;
  const canStartVisit = statusData?.status === 'scheduled';
  const canSubmitVisit = statusData?.status === 'in_progress';
  const evidencePhotoIds = useMemo(() => statusData?.evidencePhotos.map((photo) => photo.id) ?? [], [statusData?.evidencePhotos]);
  const maintenanceNeedsRefresh = statusData?.maintenanceStatus === 'requires_reverification' || statusData?.maintenanceStatus === 'reverification_pending';
  const maintenanceReasonLabel = getMaintenanceReasonLabel(statusData?.maintenanceTriggerReason ?? null);
  const currentStatusLabel = statusData?.maintenanceLabel || statusData?.statusLabel || 'Pendiente de agenda';
  const currentStatusDescription = statusData?.maintenanceDescription || statusData?.statusDescription || 'La solicitud sigue abierta y falta definir la agenda manual.';

  const loadStatus = async () => {
    if (!propertyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const query = new URLSearchParams({ propertyId });

      if (orderId) {
        query.set('orderId', orderId);
      }

      const response = await apiJson<OnsiteVerificationStatusResponse>(`/api/verification/onsite/status?${query.toString()}`, {
        includeCredentials: true,
      });

      setStatusData(response);
    } catch (error) {
      showToast('Verificacion', error instanceof Error ? error.message : 'No pudimos cargar el estado operativo de esta visita.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [propertyId, orderId]);

  useEffect(() => {
    if (!statusData) {
      return;
    }

    setAppointmentDate(statusData.appointmentDate ?? '');
    setCoordinationNotes(statusData.coordinationNotes ?? '');
    setVerifierName(statusData.verifierName ?? '');
    setVisitNotes(statusData.evidence.notes ?? '');
    setGeolocation(statusData.evidence.geolocation ?? '');
    setTimestamp(statusData.evidence.timestamp ?? new Date().toISOString());
    setChecklist(statusData.checklist);
  }, [statusData?.orderId]);

  const runAction = async (actionKey: string, callback: () => Promise<void>) => {
    setActionInFlight(actionKey);

    try {
      await callback();
    } finally {
      setActionInFlight(null);
    }
  };

  const handleScheduleVisit = async () => {
    if (!propertyId) {
      showToast('Verificacion', 'No encontramos la propiedad para esta solicitud presencial.', 'error');
      return;
    }

    if (!appointmentDate) {
      showToast('Verificacion', 'Elegi un horario operativo para dejar la agenda registrada.', 'warning');
      return;
    }

    await runAction('schedule', async () => {
      await apiJson('/api/verification/onsite/complete', {
        method: 'POST',
        includeCredentials: true,
        body: JSON.stringify({
          propertyId,
          orderId: statusData?.orderId ?? orderId,
          appointmentDate,
          coordinationNotes,
        }),
      });

      showToast('Verificacion presencial', 'La visita quedo programada y lista para pasar a validacion en proceso.', 'success');
      await loadStatus();
    });
  };

  const handleStartVisit = async () => {
    if (!propertyId) {
      return;
    }

    await runAction('start', async () => {
      await apiJson('/api/verification/onsite/start', {
        method: 'POST',
        includeCredentials: true,
        body: JSON.stringify({
          propertyId,
          orderId: statusData?.orderId ?? orderId,
        }),
      });

      showToast('Verificacion presencial', 'La visita ya figura como validacion en proceso.', 'success');
      await loadStatus();
    });
  };

  const handleUploadEvidence = async () => {
    if (!propertyId) {
      return;
    }

    if (selectedFiles.length === 0) {
      showToast('Verificacion', 'Subi al menos una foto para dejar respaldo minimo.', 'warning');
      return;
    }

    await runAction('upload', async () => {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      formData.append('assetKind', 'photo');
      formData.append('workflowContext', 'onsite-evidence');

      if (statusData?.orderId || orderId) {
        formData.append('orderId', statusData?.orderId ?? orderId ?? '');
      }

      const response = await apiFetch(`/api/properties/${propertyId}/verification/assets`, {
        method: 'POST',
        includeCredentials: true,
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === 'string' ? body.error : 'No pudimos subir la evidencia minima.');
      }

      setSelectedFiles([]);
      showToast('Verificacion presencial', 'La evidencia fotografica quedo guardada.', 'success');
      await loadStatus();
    });
  };

  const handleCaptureLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Verificacion', 'Este dispositivo no permite capturar geolocalizacion desde el navegador.', 'warning');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        showToast('Verificacion presencial', 'La geolocalizacion quedo cargada en el registro.', 'success');
      },
      () => {
        showToast('Verificacion', 'No pudimos leer la geolocalizacion desde este navegador.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmitVisit = async (result: 'requires_review' | 'not_completed') => {
    if (!propertyId) {
      return;
    }

    if (!verifierName.trim()) {
      showToast('Verificacion', 'Indica quien realizo la visita para dejar trazabilidad basica.', 'warning');
      return;
    }

    await runAction(result, async () => {
      await apiJson('/api/verification/onsite/report', {
        method: 'POST',
        includeCredentials: true,
        body: JSON.stringify({
          propertyId,
          orderId: statusData?.orderId ?? orderId,
          verifierName,
          notes: visitNotes,
          geolocation: geolocation || null,
          timestamp,
          result,
          evidencePhotoIds,
          checklist,
        }),
      });

      showToast(
        'Verificacion presencial',
        result === 'requires_review'
          ? 'El registro operativo ya quedo enviado a revision interna.'
          : 'La visita se marco como no completada y la publicacion sigue sin sello presencial.',
        'success',
      );
      await loadStatus();
    });
  };

  if (!propertyId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <button
            type="button"
            onClick={() => void onComplete()}
            className="glass rounded-2xl p-2.5 text-slate-600 dark:text-slate-400"
          >
            <Icons.ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-extrabold tracking-tighter">Alquiler Real</h2>
          <div className="w-10" />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="max-w-md rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-amber-100 dark:bg-amber-900/20">
              <Icons.Info className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Falta la propiedad</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              No encontramos la publicacion para esta verificacion presencial. Volve al panel y abri la solicitud desde ahi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
        <button
          type="button"
          onClick={() => void onComplete()}
          className="glass rounded-2xl p-2.5 text-slate-600 dark:text-slate-400"
        >
          <Icons.ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-extrabold tracking-tighter">Alquiler Real</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 space-y-6 px-6 py-6">
        <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] p-6 shadow-[0_28px_72px_-42px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <Icons.ShieldCheck className="h-4 w-4" />
                Verificacion presencial
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{resolvedPropertyTitle}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Flujo operativo base para coordinar agenda manual, registrar evidencia minima y cerrar la visita con historial trazable.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Estado actual</p>
              {isLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  Cargando...
                </div>
              ) : (
                <>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{currentStatusLabel}</p>
                  <p className="mt-1 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300">{currentStatusDescription}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Icons.Loader2 className="h-5 w-5 animate-spin" />
              Cargando el estado operativo de esta verificacion...
            </div>
          </div>
        ) : (
          <>
            <section
              className={cn(
                'rounded-[28px] border p-6',
                maintenanceNeedsRefresh
                  ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20'
                  : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-950/20',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'rounded-2xl p-3',
                  maintenanceNeedsRefresh
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100',
                )}>
                  <Icons.ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vigencia de la verificación</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {statusData?.maintenanceDescription || 'Acá ves cuándo quedó validada la última visita y si conviene actualizarla.'}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Estado</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{statusData?.maintenanceLabel || 'Sin validación vigente'}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Última validación</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(statusData?.lastValidatedAt ?? null)}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Actualizar antes de</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(statusData?.expiresAt ?? null)}</p>
                    </div>
                  </div>

                  {maintenanceReasonLabel ? (
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Motivo operativo</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{maintenanceReasonLabel}</p>
                    </div>
                  ) : null}

                  {statusData?.maintenanceHistory?.length ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Historial de mantenimiento</p>
                      {[...(statusData?.maintenanceHistory ?? [])].reverse().map((entry) => (
                        <div key={entry.id} className="rounded-[24px] border border-white/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{getMaintenanceHistoryStatusLabel(entry.status)}</p>
                              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{entry.actorLabel}</p>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-300">{formatDateTime(entry.date)}</p>
                          </div>
                          {entry.reason ? (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Motivo: {getMaintenanceReasonLabel(entry.reason)}</p>
                          ) : null}
                          {entry.notes ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{entry.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 dark:bg-blue-900/20">
                  <Icons.Calendar className="h-5 w-5 text-blue-700 dark:text-blue-200" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Coordinacion manual</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      En el MVP la agenda se registra de forma simple: sin calendarios complejos, sin automatizaciones y con una nota operativa breve.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {ONSITE_APPOINTMENT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={!canScheduleVisit}
                        onClick={() => setAppointmentDate(option)}
                        className={cn(
                          'rounded-[24px] border px-4 py-4 text-left transition-all',
                          appointmentDate === option
                            ? 'border-blue-600 bg-blue-600 text-white shadow-[0_20px_50px_-30px_rgba(37,99,235,0.75)]'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200',
                          !canScheduleVisit && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <p className="text-sm font-semibold">{formatDateTime(option)}</p>
                        <p className={cn('mt-1 text-xs', appointmentDate === option ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400')}>
                          Agenda operativa sugerida
                        </p>
                      </button>
                    ))}
                  </div>

                  <label className="block space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Nota de coordinacion</span>
                    <textarea
                      value={coordinationNotes}
                      onChange={(event) => setCoordinationNotes(event.target.value)}
                      disabled={!canScheduleVisit}
                      rows={3}
                      placeholder="Ej: acceso por porton lateral, contacto en recepcion o referencia de llegada."
                      className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                    />
                  </label>

                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Agenda registrada</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(statusData?.appointmentDate ?? appointmentDate)}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{statusData?.coordinationNotes || coordinationNotes || 'Todavia no hay una nota operativa cargada.'}</p>
                  </div>

                  {canScheduleVisit ? (
                    <Button
                      type="button"
                      onClick={() => void handleScheduleVisit()}
                      loading={actionInFlight === 'schedule'}
                      loadingLabel="Guardando agenda..."
                    >
                      Guardar visita programada
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 dark:bg-emerald-900/20">
                  <Icons.CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registro de visita</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Checklist minimo, evidencia fotografica, geolocalizacion, timestamp y observaciones breves para que la revison interna cierre el resultado.
                    </p>
                  </div>

                  {canStartVisit ? (
                    <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
                      <p className="text-sm leading-6 text-blue-900 dark:text-blue-100">
                        La visita ya esta programada para {formatDateTime(statusData?.appointmentDate)}. Cuando arranque, pasala a validacion en proceso.
                      </p>
                      <Button
                        type="button"
                        onClick={() => void handleStartVisit()}
                        loading={actionInFlight === 'start'}
                        loadingLabel="Actualizando estado..."
                        className="mt-4"
                      >
                        Marcar validacion en proceso
                      </Button>
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    {CHECKLIST_ITEMS.map((item) => (
                      <label key={item.key} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                        <div className="flex items-start gap-3">
                          <input
                            aria-label={item.label}
                            type="checkbox"
                            checked={checklist[item.key]}
                            disabled={!canSubmitVisit}
                            onChange={(event) => setChecklist((current) => ({ ...current, [item.key]: event.target.checked }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.help}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Verificador</span>
                      <input
                        type="text"
                        value={verifierName}
                        onChange={(event) => setVerifierName(event.target.value)}
                        disabled={!canSubmitVisit}
                        placeholder="Nombre o iniciales"
                        className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Fecha y hora del registro</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={timestamp}
                          onChange={(event) => setTimestamp(event.target.value)}
                          disabled={!canSubmitVisit}
                          className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                        />
                        <Button type="button" variant="secondary" onClick={() => setTimestamp(new Date().toISOString())} disabled={!canSubmitVisit}>
                          Ahora
                        </Button>
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1.3fr,0.7fr]">
                    <label className="block space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Observaciones breves</span>
                      <textarea
                        value={visitNotes}
                        onChange={(event) => setVisitNotes(event.target.value)}
                        disabled={!canSubmitVisit}
                        rows={4}
                        placeholder="Describe solo lo operativo: acceso, referencia, desvio o dato minimo para revisar el caso."
                        className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                      />
                    </label>

                    <div className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Geolocalizacion</span>
                        <Button type="button" variant="secondary" onClick={handleCaptureLocation} disabled={!canSubmitVisit}>
                          <Icons.MapPin className="h-4 w-4" />
                          Capturar
                        </Button>
                      </div>
                      <input
                        aria-label="Geolocalizacion"
                        type="text"
                        value={geolocation}
                        onChange={(event) => setGeolocation(event.target.value)}
                        disabled={!canSubmitVisit}
                        placeholder="Latitud, longitud"
                        className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Fotos minimas</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          Subi respaldo basico para la visita. Las fotos quedan privadas y no reemplazan las imagenes publicas del aviso.
                        </p>
                      </div>
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-300">
                        {statusData?.evidence.photoCount ?? 0} foto(s) cargadas
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                      <label className="flex-1 rounded-[24px] border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-blue-300 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950/50">
                        <span className="flex items-center gap-2 font-medium">
                          <Icons.Camera className="h-4 w-4" />
                          Fotos minimas
                        </span>
                        <input
                          aria-label="Fotos minimas"
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={!canSubmitVisit}
                          onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                          className="mt-2 block w-full text-sm"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleUploadEvidence()}
                        loading={actionInFlight === 'upload'}
                        loadingLabel="Subiendo fotos..."
                        disabled={!canSubmitVisit}
                      >
                        Guardar evidencia
                      </Button>
                    </div>

                    {selectedFiles.length > 0 ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                        Listas para subir: {selectedFiles.map((file) => file.name).join(', ')}
                      </p>
                    ) : null}

                    {statusData?.evidencePhotos.length ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {statusData.evidencePhotos.map((photo) => (
                          <div key={photo.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/60">
                            <img
                              src={photo.thumbnailUrl || photo.fileUrl}
                              alt={photo.originalName}
                              className="h-32 w-full object-cover"
                            />
                            <div className="space-y-1 px-3 py-3">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{photo.originalName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-300">{formatDateTime(photo.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {canSubmitVisit ? (
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Button
                        type="button"
                        onClick={() => void handleSubmitVisit('requires_review')}
                        loading={actionInFlight === 'requires_review'}
                        loadingLabel="Enviando a revision..."
                      >
                        Enviar a revision interna
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleSubmitVisit('not_completed')}
                        loading={actionInFlight === 'not_completed'}
                        loadingLabel="Guardando cierre..."
                      >
                        Marcar visita no completada
                      </Button>
                    </div>
                  ) : null}

                  {statusData?.status === 'requires_review' ? (
                    <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
                      <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">
                        El registro ya paso a revision interna. Hasta cerrar ese analisis, la publicacion sigue sin sello presencial activo.
                      </p>
                    </div>
                  ) : null}

                  {statusData?.status === 'approved' && statusData?.maintenanceStatus === 'verified' ? (
                    <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/20">
                      <p className="text-sm leading-6 text-emerald-900 dark:text-emerald-100">
                        La revision interna aprobo la visita y la propiedad ya muestra el sello "Verificado presencialmente".
                      </p>
                    </div>
                  ) : null}

                  {maintenanceNeedsRefresh ? (
                    <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
                      <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">
                        {statusData?.maintenanceDescription || 'La verificación presencial necesita actualizarse.'} El historial de la visita previa se mantiene visible en esta ficha operativa.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                  <Icons.ListTodo className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial operativo</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Guardamos fecha, verificador, estado y evidencia basica para sostener trazabilidad sin complejidad innecesaria.
                    </p>
                  </div>

                  {statusData?.history.length ? (
                    <div className="space-y-3">
                      {[...statusData.history].reverse().map((entry) => (
                        <div key={entry.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{getHistoryStatusLabel(entry.status)}</p>
                              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{entry.actorLabel}</p>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-300">{formatDateTime(entry.date)}</p>
                          </div>
                          {entry.verifierName ? (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Verificador: {entry.verifierName}</p>
                          ) : null}
                          {entry.notes ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{entry.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                      Todavia no hay hitos registrados para esta solicitud.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="space-y-4 border-t border-slate-100 p-6 dark:border-slate-800">
        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4">
          <div className="flex items-start gap-3">
            <Icons.Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <p className="text-sm leading-6 text-slate-600">{VERIFICATION_PRIVACY_NOTICES.bookingSupport}</p>
          </div>
        </div>

        <Button type="button" variant="secondary" onClick={() => void onComplete()}>
          Volver al panel
        </Button>
      </div>
    </div>
  );
};

export default OnsiteVerificationWorkflow;