import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { NoticeBanner } from './ui/NoticeBanner';

type Props = {
  checkIn: string;
  checkOut: string;
  setCheckIn: (s: string) => void;
  setCheckOut: (s: string) => void;
  minDate?: string;
  onChange?: () => void;
  propertyId?: string;
  availabilityRefreshToken?: number;
  mode?: 'booking' | 'blocking';
  monthsToShow?: 1 | 2;
};

type AvailabilityRange = {
  start: string;
  end: string;
};

const formatIso = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDisplay = (iso?: string) => {
  if (!iso) return 'Agregar fecha';
  try { return parseIsoDate(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }); } catch { return iso; }
};

const formatLongDisplay = (iso?: string) => {
  if (!iso) return 'Sin fecha elegida';
  try {
    return parseIsoDate(iso).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const addMonths = (d: Date, n = 1) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonthsKeepingDay = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
};

const endOfWeek = (date: Date) => {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  return next;
};

const isSameMonth = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const generateWeeks = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday-first index
  const startIndex = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startIndex; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const normalizeAvailabilityRanges = (payload: unknown): AvailabilityRange[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((entry) => {
      if (typeof entry === 'string') {
        return { start: entry, end: entry };
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const maybeRange = entry as Record<string, unknown>;
      const start = typeof maybeRange.start === 'string'
        ? maybeRange.start
        : typeof maybeRange.startDate === 'string'
          ? maybeRange.startDate
          : typeof maybeRange.date === 'string'
            ? maybeRange.date
            : null;
      const end = typeof maybeRange.end === 'string'
        ? maybeRange.end
        : typeof maybeRange.endDate === 'string'
          ? maybeRange.endDate
          : start;

      if (!start || !end) {
        return null;
      }

      return { start, end };
    })
    .filter((range): range is AvailabilityRange => Boolean(range));
};

const expandBlockedDates = (ranges: AvailabilityRange[]) => {
  const blockedDates = new Set<string>();

  ranges.forEach((range) => {
    const startDate = parseIsoDate(range.start);
    const rawEndDate = parseIsoDate(range.end);
    const inclusiveEndDate = range.end > range.start ? addDays(rawEndDate, -1) : rawEndDate;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(inclusiveEndDate.getTime()) || inclusiveEndDate < startDate) {
      return;
    }

    const cursor = new Date(startDate);
    while (cursor <= inclusiveEndDate) {
      blockedDates.add(formatIso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return blockedDates;
};

const getMonthLabel = (date: Date) => date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

const DateRangePicker: React.FC<Props> = ({ checkIn, checkOut, setCheckIn, setCheckOut, minDate, onChange, propertyId, availabilityRefreshToken = 0, mode = 'booking', monthsToShow = 2 }) => {
  const todayIso = minDate || formatIso(new Date());
  const [visible, setVisible] = useState<Date>(() => new Date());
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [availabilityRanges, setAvailabilityRanges] = useState<AvailabilityRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(Boolean(propertyId));
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusIsoRef = useRef<string | null>(null);
  const panelId = useId();
  const statusId = useId();
  const instructionsId = useId();

  const visibleMonths = useMemo(
    () => (monthsToShow === 2 ? [visible, addMonths(visible, 1)] : [visible]),
    [monthsToShow, visible],
  );
  const blockedDates = useMemo(() => expandBlockedDates(availabilityRanges), [availabilityRanges]);
  const hasCompleteRange = Boolean(checkIn && checkOut);
  const hasPartialRange = Boolean((checkIn && !checkOut) || (!checkIn && checkOut));
  const nights = hasCompleteRange
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const dateCopy = mode === 'blocking'
    ? {
        selectionTitle: !checkIn
          ? 'Elegí el inicio y el fin del bloqueo'
          : !checkOut
            ? 'Ahora elegí hasta cuándo bloquear'
            : `${nights} ${nights === 1 ? 'noche bloqueada' : 'noches bloqueadas'}`,
        selectionDescription: !checkIn
          ? 'Primero marcás desde cuándo querés bloquear y después elegís hasta cuándo mantenerlo cerrado.'
          : !checkOut
            ? `El bloqueo arranca el ${formatDisplay(checkIn)}. Elegí la fecha final para completar el rango.`
            : `Bloqueado del ${formatDisplay(checkIn)} al ${formatDisplay(checkOut)}.`,
        triggerSummary: hasCompleteRange
          ? `${nights} ${nights === 1 ? 'noche bloqueada' : 'noches bloqueadas'} · ${formatDisplay(checkIn)} al ${formatDisplay(checkOut)}`
          : hasPartialRange
            ? `Inicio de bloqueo para el ${formatDisplay(checkIn)}. Falta la fecha final.`
            : 'Todavía no elegiste fechas para bloquear',
        headerEyebrow: 'Fechas para bloquear',
        startLabel: 'Desde',
        endLabel: 'Hasta',
        startHint: 'Marcá desde cuándo querés cerrar la publicación.',
        endHint: 'Elegí hasta cuándo no querés recibir reservas.',
        helper: hasCompleteRange
          ? 'El rango quedó listo. Si querés, podés volver a elegir el inicio del bloqueo.'
          : hasPartialRange
            ? 'Te falta la fecha final para guardar el bloqueo.'
            : 'Elegí primero el inicio y después el final para bloquear ese tramo.',
      }
    : {
        selectionTitle: !checkIn
          ? 'Elegí tu ingreso y salida'
          : !checkOut
            ? 'Ahora elegí la salida'
            : `${nights} ${nights === 1 ? 'noche seleccionada' : 'noches seleccionadas'}`,
        selectionDescription: !checkIn
          ? 'Primero marcás el ingreso y después la salida para completar la estadía.'
          : !checkOut
            ? `Tu ingreso quedó para el ${formatDisplay(checkIn)}. Elegí la salida para cerrar el rango.`
            : `Del ${formatDisplay(checkIn)} al ${formatDisplay(checkOut)}.`,
        triggerSummary: hasCompleteRange
          ? `${nights} ${nights === 1 ? 'noche' : 'noches'} · ${formatDisplay(checkIn)} al ${formatDisplay(checkOut)}`
          : hasPartialRange
            ? `Ingreso elegido para el ${formatDisplay(checkIn)}. Falta la salida.`
            : 'Todavía no elegiste fechas',
        headerEyebrow: 'Fechas de la estadía',
        startLabel: 'Ingreso',
        endLabel: 'Salida',
        startHint: 'Marcá tu fecha de llegada.',
        endHint: 'Elegí cuándo termina la estadía.',
        helper: hasCompleteRange
          ? 'Ya tenés el rango completo. Si querés, podés volver a elegir el ingreso.'
          : hasPartialRange
            ? 'Te falta la salida para cerrar el rango.'
            : 'Elegí primero el ingreso y después la salida para calcular la estadía.',
      };

  const isAfter = (a: string, b: string) => parseIsoDate(a) > parseIsoDate(b);

  const hasBlockedNightBetween = (startIso: string, endIso: string) => {
    if (!startIso || !endIso || endIso <= startIso) {
      return false;
    }

    const cursor = parseIsoDate(startIso);
    const endDate = parseIsoDate(endIso);

    while (cursor < endDate) {
      if (blockedDates.has(formatIso(cursor))) {
        return true;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return false;
  };

  const isDayUnavailable = (iso: string) => {
    if (iso < todayIso) {
      return true;
    }

    if (propertyId && (availabilityLoading || availabilityError)) {
      return true;
    }

    if (!blockedDates.size) {
      return false;
    }

    if (!checkIn || checkOut) {
      return blockedDates.has(iso);
    }

    if (iso <= checkIn) {
      return blockedDates.has(iso);
    }

    return hasBlockedNightBetween(checkIn, iso);
  };

  const syncChange = () => onChange?.();

  const loadAvailability = async () => {
    if (!propertyId) {
      setAvailabilityRanges([]);
      setAvailabilityError(null);
      setAvailabilityLoading(false);
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError(null);

    try {
      const nextAvailability = await apiJson<unknown[]>(`/api/properties/${propertyId}/availability`);
      setAvailabilityRanges(normalizeAvailabilityRanges(nextAvailability));
    } catch (error) {
      setAvailabilityRanges([]);
      setAvailabilityError(error instanceof Error ? error.message : 'No pudimos cargar las fechas ocupadas.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const clearSelection = () => {
    setCheckIn('');
    setCheckOut('');
    setHoverIso(null);
    syncChange();
  };

  const restoreFocusToTrigger = () => {
    const frame = window.requestAnimationFrame(() => triggerRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  };

  const handleDayClick = (date: Date) => {
    const iso = formatIso(date);
    if (isDayUnavailable(iso)) return;
    if (!checkIn) { setCheckIn(iso); setCheckOut(''); syncChange(); return; }
    if (checkIn && !checkOut) {
      if (isAfter(iso, checkIn)) {
        setCheckOut(iso);
        syncChange();
        setIsOpen(false);
        setHoverIso(null);
        restoreFocusToTrigger();
        return;
      }
      // clicked earlier or same day -> change start
      setCheckIn(iso);
      setCheckOut('');
      syncChange();
      return;
    }
    // both present -> start new range
    setCheckIn(iso);
    setCheckOut('');
    syncChange();
  };

  const closePicker = (restoreFocus = true) => {
    setIsOpen(false);
    setHoverIso(null);
    if (restoreFocus) {
      restoreFocusToTrigger();
    }
  };

  const focusDay = (iso: string) => {
    const nextButton = dayRefs.current[iso];
    if (!nextButton || nextButton.disabled) return;
    nextButton.focus();
  };

  const focusCalendarDay = (date: Date) => {
    const iso = formatIso(date);
    const targetMonth = getMonthStart(date);
    const [firstVisibleMonth, secondVisibleMonth] = visibleMonths.map(getMonthStart);

    if (isSameMonth(targetMonth, firstVisibleMonth) || isSameMonth(targetMonth, secondVisibleMonth)) {
      focusDay(iso);
      return;
    }

    pendingFocusIsoRef.current = iso;
    setVisible(targetMonth);
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, date: Date) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDayClick(date);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setHoverIso(null);
      if (checkIn && !checkOut) {
        clearSelection();
      }
      closePicker();
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      focusCalendarDay(startOfWeek(date));
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      focusCalendarDay(endOfWeek(date));
      return;
    }

    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      focusCalendarDay(addMonthsKeepingDay(date, e.key === 'PageDown' ? 1 : -1));
      return;
    }

    const deltaByKey: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7
    };

    const delta = deltaByKey[e.key];
    if (!delta) return;

    e.preventDefault();
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + delta);
    focusCalendarDay(nextDate);
  };

  const inRange = (iso: string) => {
    if (!checkIn) return false;
    if (checkIn && !checkOut && hoverIso) {
      const start = checkIn;
      const end = hoverIso;
      if (parseIsoDate(start) <= parseIsoDate(end)) return iso >= start && iso <= end;
      return iso >= end && iso <= start;
    }
    if (checkIn && checkOut) {
      const start = checkIn;
      const end = checkOut;
      return iso >= start && iso <= end;
    }
    return false;
  };

  useEffect(() => {
    void loadAvailability();
  }, [propertyId, availabilityRefreshToken]);

  useEffect(() => {
    if (!checkIn || propertyId && availabilityLoading) return;

    if (blockedDates.has(checkIn)) {
      setCheckIn('');
      setCheckOut('');
      setHoverIso(null);
      syncChange();
      return;
    }

    if (checkOut && hasBlockedNightBetween(checkIn, checkOut)) {
      setCheckOut('');
      setHoverIso(null);
      syncChange();
    }
  }, [blockedDates, availabilityLoading, checkIn, checkOut, propertyId]);

  useEffect(() => {
    if (!isOpen) return;

    const focusIsoTarget = checkIn || todayIso;
  const focusDate = parseIsoDate(focusIsoTarget);
    setVisible(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));

    const frame = window.requestAnimationFrame(() => {
      focusDay(focusIsoTarget);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, checkIn, todayIso]);

  useEffect(() => {
    if (!isOpen || !pendingFocusIsoRef.current) return;

    const targetIso = pendingFocusIsoRef.current;
    pendingFocusIsoRef.current = null;

    const frame = window.requestAnimationFrame(() => {
      focusDay(targetIso);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, visible]);

  return (
    <div className="w-full">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="auto"
        fullWidth
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-describedby={statusId}
        aria-label={`Abrir calendario de fechas. ${dateCopy.triggerSummary}.`}
        onClick={() => {
          if (isOpen) {
            closePicker(false);
            return;
          }
          setIsOpen(true);
        }}
        className={cn(
          'grid overflow-hidden rounded-2xl p-0 text-left whitespace-normal',
          isOpen ? 'border-slate-300 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.35)]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
        )}
      >
        <div className="grid w-full grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{dateCopy.startLabel}</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{formatDisplay(checkIn)}</div>
          </div>
          <div className="px-3 py-3 text-left sm:text-right">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{dateCopy.endLabel}</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{formatDisplay(checkOut)}</div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex min-w-0 items-start gap-2 text-left">
            <Icons.Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="whitespace-normal break-words">{dateCopy.triggerSummary}</span>
          </div>
          {hasCompleteRange ? <span className="font-semibold text-brand">Rango listo</span> : null}
        </div>
      </Button>

      <div id={statusId} aria-live="polite" className="sr-only">
        {dateCopy.selectionTitle}. {dateCopy.selectionDescription}
      </div>

      <div className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-200 ease-out ${isOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-1 grid-rows-[0fr] opacity-0 scale-[0.99] pointer-events-none'}`}>
        <div className="min-h-0 overflow-hidden">
          <Card
            id={panelId}
            role={isOpen ? 'dialog' : undefined}
            aria-modal={isOpen ? 'false' : undefined}
            aria-label={isOpen ? 'Selector de rango de fechas' : undefined}
            aria-describedby={isOpen ? instructionsId : undefined}
            aria-hidden={!isOpen}
            padding="sm"
            className={`origin-top rounded-[26px] border-slate-200 shadow-[0_26px_60px_-30px_rgba(15,23,42,0.32)] transition-all duration-200 ease-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-[0.985] -translate-y-1'}`}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{dateCopy.headerEyebrow}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{dateCopy.selectionTitle}</p>
                  <p id={instructionsId} className="mt-1 text-xs leading-5 text-slate-500">
                    {dateCopy.selectionDescription} Podés moverte con flechas y elegir con Enter.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {checkIn || checkOut ? (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="rounded-full px-3 text-xs">
                      <Icons.X className="h-3.5 w-3.5" />
                      Limpiar
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" size="sm" onClick={() => closePicker()} className="rounded-full px-3 text-xs md:hidden">
                    Cerrar
                  </Button>
                </div>
              </div>

              <div className={cn('grid grid-cols-1 gap-2', monthsToShow === 2 && 'sm:grid-cols-2')}>
                <div className={cn('rounded-2xl border px-3 py-3', checkIn ? 'border-brand/20 bg-brand/5' : 'border-slate-200 bg-slate-50')}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{dateCopy.startLabel}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDisplay(checkIn)}</div>
                  <div className="mt-1 text-xs text-slate-500">{checkIn ? formatLongDisplay(checkIn) : dateCopy.startHint}</div>
                </div>
                <div className={cn('rounded-2xl border px-3 py-3 text-left', monthsToShow === 2 && 'sm:text-right', checkOut ? 'border-slate-900/10 bg-slate-900/[0.03]' : 'border-slate-200 bg-slate-50')}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{dateCopy.endLabel}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDisplay(checkOut)}</div>
                  <div className="mt-1 text-xs text-slate-500">{checkOut ? formatLongDisplay(checkOut) : dateCopy.endHint}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                <Icons.Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{dateCopy.helper}</span>
              </div>

              {propertyId ? (
                availabilityLoading ? (
                  <NoticeBanner
                    tone="info"
                    heading="Consultando disponibilidad"
                    description="Estamos trayendo las fechas ocupadas para bloquearlas antes de que confirmes la reserva."
                  />
                ) : availabilityError ? (
                  <div className="space-y-3">
                    <NoticeBanner
                      tone="warning"
                      heading="No pudimos cargar la disponibilidad"
                      description={availabilityError}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => void loadAvailability()} className="rounded-full px-3 text-xs">
                      Reintentar
                    </Button>
                  </div>
                ) : blockedDates.size > 0 ? (
                  <NoticeBanner
                    tone="info"
                    heading="Fechas ocupadas bloqueadas"
                    description="El calendario ya está marcando los días que no se pueden reservar para esta propiedad."
                  />
                ) : null
              ) : null}

              <div className={cn('grid gap-4', monthsToShow === 2 && 'md:grid-cols-2')}>
              {visibleMonths.map((m, idx) => {
                const year = m.getFullYear();
                const month = m.getMonth();
                const weeks = generateWeeks(year, month);
                const showInlinePrev = idx === 0;
                const showInlineNext = monthsToShow === 1 || idx === visibleMonths.length - 1;

                return (
                  <div key={idx} className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-3 sm:p-4">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      {showInlinePrev ? (
                        <Button type="button" onClick={() => setVisible(addMonths(visible, -1))} variant="ghost" size="sm" aria-label="Ver mes anterior" className="rounded-full px-2.5 py-1.5 text-sm">
                          <Icons.ChevronLeft className="h-4 w-4" />
                        </Button>
                      ) : <div className="h-9 w-9" />}

                      <div className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-slate-900">{getMonthLabel(m)}</div>

                      {showInlineNext ? (
                        <Button type="button" onClick={() => setVisible(addMonths(visible, 1))} variant="ghost" size="sm" aria-label="Ver mes siguiente" className="rounded-full px-2.5 py-1.5 text-sm">
                          <Icons.ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : <div className="h-9 w-9" />}
                    </div>

                    <div className="mb-3 grid grid-cols-7 gap-1 text-[11px] text-center font-medium text-slate-500">
                      {weekDays.map(d => (<div key={d}>{d}</div>))}
                    </div>

                    <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendario ${getMonthLabel(m)}`}>
                      {weeks.map((week, wi) => (
                        <div key={wi} role="row" className="contents">
                          {week.map((day, di) => {
                            if (!day) return <div key={di} className="h-10 w-10 md:h-11 md:w-11" />;
                            const iso = formatIso(day);
                            const disabled = isDayUnavailable(iso);
                            const blockedByAvailability = !availabilityLoading && !availabilityError && blockedDates.has(iso);
                            const isToday = iso === todayIso;
                            const start = checkIn === iso;
                            const end = checkOut === iso;
                            const inRangeFinal = inRange(iso);
                            const isPreview = !!(checkIn && !checkOut && hoverIso);

                            const dayLabel = [formatLongDisplay(iso), `(${iso})`];

                            if (blockedByAvailability) dayLabel.push('Fecha ocupada');
                            else if (disabled) dayLabel.push('No disponible');
                            else if (start && end) dayLabel.push('Ingreso y salida');
                            else if (start) dayLabel.push('Fecha de ingreso');
                            else if (end) dayLabel.push('Fecha de salida');
                            else if (inRangeFinal) dayLabel.push('Dentro del rango');

                            let fillCls = '';
                            if (start && !end) fillCls = 'before:absolute before:inset-y-1 before:left-1/2 before:right-0 before:rounded-r-full before:bg-brand/20';
                            else if (end && !start) fillCls = 'before:absolute before:inset-y-1 before:left-0 before:right-1/2 before:rounded-l-full before:bg-brand/20';
                            else if (inRangeFinal && !(start || end)) fillCls = `before:absolute before:inset-y-1 before:left-0 before:right-0 ${isPreview ? 'before:bg-brand/10' : 'before:bg-brand/20'}`;

                            const buttonBase = 'relative z-10 h-10 w-10 rounded-full text-sm transition-[transform,background-color,color,box-shadow,border-color] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white md:h-11 md:w-11';
                            const buttonState = disabled
                              ? blockedByAvailability
                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500 opacity-90'
                                : 'cursor-not-allowed text-slate-300 opacity-70'
                              : 'text-slate-700 hover:scale-[1.03] hover:bg-slate-100 active:scale-[0.97]';

                            let selectionCls = 'bg-transparent';
                            if (start && end) selectionCls = 'bg-slate-900 text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]';
                            else if (start) selectionCls = 'bg-brand text-white shadow-[0_10px_20px_-14px_rgba(14,116,144,0.75)]';
                            else if (end) selectionCls = 'bg-slate-900 text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]';
                            else if (inRangeFinal) selectionCls = isPreview ? 'bg-brand/5 text-slate-900' : 'bg-brand/10 text-slate-900';
                            else if (isToday && !disabled) selectionCls = 'border border-brand/30 bg-white text-slate-900';

                            return (
                              <div key={di} role="gridcell" aria-selected={start || end || inRangeFinal} className={`relative flex h-10 w-10 items-center justify-center md:h-11 md:w-11 ${fillCls}`}>
                                <button
                                  type="button"
                                  ref={(node) => { dayRefs.current[iso] = node; }}
                                  onMouseEnter={() => !disabled && setHoverIso(iso)}
                                  onMouseLeave={() => setHoverIso(null)}
                                  onClick={() => handleDayClick(day)}
                                  onKeyDown={(e) => handleDayKeyDown(e, day)}
                                  disabled={disabled}
                                  aria-label={dayLabel.join('. ')}
                                  aria-current={isToday ? 'date' : undefined}
                                  className={`${buttonBase} ${buttonState} ${selectionCls}`}
                                >
                                  <span className={`${start || end ? 'font-semibold' : ''}`}>{day.getDate()}</span>
                                  {isToday && !disabled ? (
                                    <span className={cn('absolute bottom-1.5 h-1.5 w-1.5 rounded-full', start || end ? 'bg-white/80' : 'bg-brand')} />
                                  ) : null}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
