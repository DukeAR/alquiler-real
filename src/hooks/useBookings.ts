import { useEffect, useState } from 'react';
import { apiFetch, apiJson } from '../lib/apiConfig';
import { Booking, type ReservationRequestMode } from '../types';

export type { Booking };

export type BookingCreateField = 'startDate' | 'endDate' | 'guests' | 'propertyId';

export interface BookingCreatePayload {
  propertyId: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalPrice?: number;
  requestMode?: ReservationRequestMode;
}

export interface BookingCreateError {
  status: number;
  code: string;
  message: string;
  field?: BookingCreateField;
}

export interface BookingCreateResponse {
  booking: Booking;
  contract: Record<string, unknown>;
  pricing: {
    nights: number;
    nightly: number;
    total: number;
  };
}

export type BookingCreateResult =
  | { ok: true; data: BookingCreateResponse }
  | { ok: false; error: BookingCreateError };

type UseBookingsOptions = {
  autoLoad?: boolean;
};

const DEFAULT_BOOKING_ERROR: BookingCreateError = {
  status: 500,
  code: 'BOOKING_CREATE_FAILED',
  message: 'No pudimos registrar la solicitud. Intentá de nuevo.',
};

const parseBookingError = async (response: Response): Promise<BookingCreateError> => {
  try {
    const payload = await response.json();
    return {
      status: response.status,
      code: typeof payload?.code === 'string' ? payload.code : 'BOOKING_REQUEST_FAILED',
      message:
        typeof payload?.message === 'string'
          ? payload.message
          : typeof payload?.error === 'string'
            ? payload.error
            : DEFAULT_BOOKING_ERROR.message,
      field: payload?.field,
    };
  } catch {
    return {
      ...DEFAULT_BOOKING_ERROR,
      status: response.status,
    };
  }
};

const getNightCount = (startDate: string, endDate: string) => {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const normalizeCreateBookingResponse = (
  payload: any,
  request: BookingCreatePayload,
): BookingCreateResponse => {
  if (payload?.booking) {
    return payload as BookingCreateResponse;
  }

  const nights = getNightCount(request.startDate, request.endDate);
  const fallbackTotal = typeof request.totalPrice === 'number' ? request.totalPrice : 0;
  const total = typeof payload?.totalPrice === 'number' ? payload.totalPrice : fallbackTotal;
  const nightly = nights > 0 ? total / nights : 0;

  return {
    booking: {
      id: typeof payload?.id === 'string' ? payload.id : '',
      propertyId: request.propertyId,
      userId: typeof payload?.userId === 'string' ? payload.userId : '',
      status:
        payload?.status === 'pending' || payload?.status === 'completed' || payload?.status === 'cancelled'
          ? payload.status
          : request.requestMode === 'protected'
            ? 'pending'
            : 'confirmed',
      startDate: request.startDate,
      endDate: request.endDate,
      guests: request.guests,
      totalPrice: total,
      requestMode: request.requestMode === 'protected' ? 'protected' : 'direct',
      contractJson: payload?.contract ? JSON.stringify(payload.contract) : undefined,
      stay_code: typeof payload?.stay_code === 'string' ? payload.stay_code : undefined,
    },
    contract: payload?.contract && typeof payload.contract === 'object' ? payload.contract : {},
    pricing: {
      nights,
      nightly,
      total,
    },
  };
};

export function useBookings(options: UseBookingsOptions = {}) {
  const { autoLoad = true } = options;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(autoLoad);

  const fetchBookings = async () => {
    setLoading(true);

    try {
      const data = await apiJson<Booking[]>('/api/bookings', { includeCredentials: true });
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }

    void fetchBookings();
  }, [autoLoad]);

  const createBooking = async ({ propertyId, startDate, endDate, guests, totalPrice, requestMode }: BookingCreatePayload): Promise<BookingCreateResult> => {
    try {
      const response = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ propertyId, startDate, endDate, guests, totalPrice, requestMode }),
        includeCredentials: true,
      });

      if (!response.ok) {
        return { ok: false, error: await parseBookingError(response) };
      }

      const payload = await response.json();
  const data = normalizeCreateBookingResponse(payload, { propertyId, startDate, endDate, guests, totalPrice, requestMode });
      void fetchBookings();

      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: {
          ...DEFAULT_BOOKING_ERROR,
          message: err instanceof Error ? err.message : DEFAULT_BOOKING_ERROR.message,
        },
      };
    }
  };

  return { bookings, loading, createBooking, refresh: fetchBookings };
}
