const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BOOKING_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const BOOKING_DATE_OFFSET = '-03:00';
const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

const getFormatterPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => (
  parts.find((part) => part.type === type)?.value ?? ''
);

const getBookingDateOnlyParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: getFormatterPart(parts, 'year'),
    month: getFormatterPart(parts, 'month'),
    day: getFormatterPart(parts, 'day'),
  };
};

const parseInstant = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseBookingDateOnly = (value?: string | null) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00${BOOKING_DATE_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const parts = getBookingDateOnlyParts(parsed);
  if (`${parts.year}-${parts.month}-${parts.day}` !== value) {
    return null;
  }

  return parsed;
};

export const formatBookingDateOnly = (value?: string | null) => {
  const parsed = parseBookingDateOnly(value);
  if (!parsed) {
    return value ?? '-';
  }

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: BOOKING_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

export const getCancellationDeadlineFromStartDate = (value?: string | null) => {
  const parsed = parseBookingDateOnly(value);
  if (!parsed) {
    return null;
  }

  return new Date(parsed.getTime() - CANCELLATION_WINDOW_MS);
};

export const formatBookingDateTime = (value?: string | Date | null) => {
  const parsed = parseInstant(value);
  if (!parsed) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: BOOKING_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);

  const day = getFormatterPart(parts, 'day');
  const month = getFormatterPart(parts, 'month');
  const year = getFormatterPart(parts, 'year');
  const hour = getFormatterPart(parts, 'hour');
  const minute = getFormatterPart(parts, 'minute');

  return `${day} ${month} ${year} a las ${hour}:${minute}`;
};