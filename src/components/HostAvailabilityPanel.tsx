import { useEffect, useMemo, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { OPERATION_COMPLETED_LABEL } from '../lib/productTerminology';
import { showToast } from '../lib/toast';
import DateRangePicker from './DateRangePicker';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { NoticeBanner } from './ui/NoticeBanner';

type AvailabilityEntry = {
  start: string;
  end: string;
  source?: 'booking' | 'manual';
  status?: string;
};

type Props = {
  propertyId: string;
  propertyTitle: string;
};

const parseLocalIso = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (value: string) => {
  return parseLocalIso(value).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatRange = (start: string, end: string) => {
  return `${formatDate(start)} -> ${formatDate(end)}`;
};

const normalizeEntries = (entries: unknown): AvailabilityEntry[] => {
  if (!Array.isArray(entries)) return [];

  const normalizedEntries: AvailabilityEntry[] = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const nextEntry = entry as Record<string, unknown>;
    if (typeof nextEntry.start !== 'string' || typeof nextEntry.end !== 'string') {
      return;
    }

    normalizedEntries.push({
      start: nextEntry.start,
      end: nextEntry.end,
      source: nextEntry.source === 'manual' ? 'manual' : 'booking',
      status: typeof nextEntry.status === 'string' ? nextEntry.status : undefined,
    });
  });

  return normalizedEntries.sort((left, right) => left.start.localeCompare(right.start));
};

export const HostAvailabilityPanel = ({ propertyId, propertyTitle }: Props) => {
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pickerRefreshToken, setPickerRefreshToken] = useState(0);

  const manualBlocks = useMemo(
    () => entries.filter((entry) => entry.source === 'manual'),
    [entries],
  );
  const bookedRanges = useMemo(
    () => entries.filter((entry) => entry.source !== 'manual'),
    [entries],
  );

  const loadAvailability = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiJson<AvailabilityEntry[]>(`/api/properties/${propertyId}/availability`, { includeCredentials: true });
      setEntries(normalizeEntries(data));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No pudimos cargar la disponibilidad de esta publicación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAvailability();
  }, [propertyId]);

  const handleClearDraft = () => {
    setBlockStart('');
    setBlockEnd('');
  };

  const persistManualBlocks = async (nextManualBlocks: Array<{ start: string; end: string }>, successMessage: string, nextSavingKey: string) => {
    setSavingKey(nextSavingKey);

    try {
      const response = await apiJson<{ manualBlocks: Array<{ start: string; end: string }> }>(`/api/properties/${propertyId}/availability`, {
        method: 'PUT',
        includeCredentials: true,
        body: JSON.stringify({ manualBlocks: nextManualBlocks }),
      });

      setEntries((currentEntries) => {
        const bookingEntries = currentEntries.filter((entry) => entry.source !== 'manual');
        const nextEntries = response.manualBlocks.map((block) => ({ ...block, source: 'manual' as const, status: 'blocked' }));
        return [...bookingEntries, ...nextEntries].sort((left, right) => left.start.localeCompare(right.start));
      });
      setPickerRefreshToken((currentValue) => currentValue + 1);
      showToast('Disponibilidad actualizada', successMessage, 'success');
    } catch (error) {
      showToast('Disponibilidad', error instanceof Error ? error.message : 'No pudimos guardar los cambios de disponibilidad.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleBlockDates = async () => {
    if (!blockStart || !blockEnd || blockEnd <= blockStart) {
      showToast('Disponibilidad', 'Elegí un rango válido antes de bloquear fechas.', 'warning');
      return;
    }

    await persistManualBlocks(
      [...manualBlocks.map((entry) => ({ start: entry.start, end: entry.end })), { start: blockStart, end: blockEnd }],
      'Las fechas quedaron bloqueadas en la publicación.',
      'save',
    );
    handleClearDraft();
  };

  const handleRemoveBlock = async (blockToRemove: AvailabilityEntry) => {
    await persistManualBlocks(
      manualBlocks
        .filter((entry) => !(entry.start === blockToRemove.start && entry.end === blockToRemove.end))
        .map((entry) => ({ start: entry.start, end: entry.end })),
      'Las fechas volvieron a quedar disponibles.',
      `${blockToRemove.start}-${blockToRemove.end}`,
    );
  };

  return (
    <Card className="mt-4 rounded-[28px] border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Disponibilidad</p>
          <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">Calendario de publicación</h3>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Revisá qué fechas ya quedaron tomadas para {propertyTitle} y bloqueá rangos nuevos por uso propio, mantenimiento o pausas.
          </p>
        </div>

        {loadError ? (
          <div className="space-y-3">
            <NoticeBanner
              tone="warning"
              icon={<Icons.ShieldAlert className="h-5 w-5" />}
              heading="No pudimos cargar este calendario"
              description={loadError}
              className="border-slate-200/90 bg-slate-50/92 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadAvailability()} className="rounded-full px-3 text-xs">
              Reintentar
            </Button>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <NoticeBanner
              tone="info"
              icon={<Icons.Calendar className="h-5 w-5" />}
              heading="Bloqueos manuales y reservas reales"
              description="Las reservas confirmadas se bloquean solas. Además podés cerrar fechas libres desde acá para que no aparezcan disponibles en el calendario público."
              className="border-brand/10 bg-brand/5 text-slate-700 dark:border-brand/20 dark:bg-brand/10 dark:text-slate-200"
            />

            <DateRangePicker
              mode="blocking"
              checkIn={blockStart}
              checkOut={blockEnd}
              setCheckIn={setBlockStart}
              setCheckOut={setBlockEnd}
              propertyId={propertyId}
              availabilityRefreshToken={pickerRefreshToken}
              onChange={() => undefined}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={() => void handleBlockDates()}
                loading={savingKey === 'save'}
                loadingLabel="Guardando bloqueo..."
                disabled={loading || Boolean(loadError) || !blockStart || !blockEnd || blockEnd <= blockStart}
                className="rounded-2xl"
              >
                Bloquear fechas
              </Button>
              {(blockStart || blockEnd) ? (
                <Button type="button" variant="secondary" size="lg" onClick={handleClearDraft} className="rounded-2xl">
                  Limpiar selección
                </Button>
              ) : null}
            </div>

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Las reservas de huéspedes se cancelan solo hasta 24 horas antes del ingreso. Si una reserva se cancela dentro del plazo, las fechas vuelven a liberarse automáticamente.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bloqueos manuales</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fechas que cerraste vos desde este calendario.</p>
                </div>
                <Badge variant="neutral">{manualBlocks.length}</Badge>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Cargando bloqueos...</p>
              ) : manualBlocks.length > 0 ? (
                <div className="space-y-3">
                  {manualBlocks.map((entry) => {
                    const entryKey = `${entry.start}-${entry.end}`;

                    return (
                      <div key={entryKey} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatRange(entry.start, entry.end)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Bloqueado manualmente</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRemoveBlock(entry)}
                          loading={savingKey === entryKey}
                          loadingLabel="Quitando..."
                          className="rounded-full px-3 text-xs"
                        >
                          Quitar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no agregaste bloqueos manuales.</p>
              )}
            </div>

            <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reservas ya tomadas</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Rangos ocupados por reservas activas o completadas.</p>
                </div>
                <Badge variant="brand">{bookedRanges.length}</Badge>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Cargando reservas...</p>
              ) : bookedRanges.length > 0 ? (
                <div className="space-y-3">
                  {bookedRanges.map((entry) => (
                    <div key={`${entry.start}-${entry.end}-${entry.status}`} className="rounded-2xl border border-brand/10 bg-brand/5 px-3 py-3 dark:border-brand/20 dark:bg-brand/10">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatRange(entry.start, entry.end)}</p>
                      <p className="text-xs text-slate-600/80 dark:text-slate-300/80">
                        {entry.status === 'completed' ? OPERATION_COMPLETED_LABEL : 'Reserva activa'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Por ahora no hay reservas bloqueando fechas en esta publicación.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HostAvailabilityPanel;
