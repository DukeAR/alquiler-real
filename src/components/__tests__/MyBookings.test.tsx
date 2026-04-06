import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { formatBookingDateTime, getCancellationDeadlineFromStartDate } from '../../lib/bookingDates';

const apiJsonMock = vi.fn();
const acceptContractMock = vi.fn();
const cancelBookingMock = vi.fn();
const payProtectedDepositMock = vi.fn();
const confirmArrivalMock = vi.fn();
const reportArrivalProblemMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../services/geminiService', () => ({
  acceptContract: (...args: unknown[]) => acceptContractMock(...args),
  cancelBooking: (...args: unknown[]) => cancelBookingMock(...args),
  payProtectedDeposit: (...args: unknown[]) => payProtectedDepositMock(...args),
  confirmArrival: (...args: unknown[]) => confirmArrivalMock(...args),
  reportArrivalProblem: (...args: unknown[]) => reportArrivalProblemMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

import { MyBookings } from '../MyBookings';

describe('MyBookings', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    acceptContractMock.mockReset();
    cancelBookingMock.mockReset();
    payProtectedDepositMock.mockReset();
    confirmArrivalMock.mockReset();
    reportArrivalProblemMock.mockReset();
    showToastMock.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  test('shows a retryable error state when bookings cannot be loaded', async () => {
    apiJsonMock
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /No pudimos cargar tus reservas/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Intentar de nuevo/i }));

    expect(await screen.findByText('Todavía no tenés reservas')).toBeInTheDocument();
    expect(apiJsonMock).toHaveBeenCalledTimes(2);
  });

  test('marks the agreement as accepted and emits success feedback', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-1',
        propertyId: 'property-1',
        userId: 'user-1',
        status: 'confirmed',
        propertyTitle: 'Depto con balcón',
        location: 'Palermo',
        startDate: '2025-06-10',
        endDate: '2025-06-12',
        guests: 2,
        totalPrice: 240000,
        contractAccepted: false,
        contractJson: JSON.stringify({
          guestName: 'Ana',
          hostName: 'Carlos',
          propertyTitle: 'Depto con balcón',
          location: 'Palermo',
          rules: ['Presentar DNI al ingreso'],
        }),
        stay_code: 'AR-1234',
      },
    ]);
    acceptContractMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Ver condiciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /Aceptar condiciones/i }));

    await waitFor(() => {
      expect(acceptContractMock).toHaveBeenCalledWith('booking-1');
    });

    expect(await screen.findByText('Condiciones aceptadas')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Firmado/i })).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Condiciones aceptadas',
      'Ya registramos la aceptación y quedó asociada a tu reserva.',
      'success',
    );
  });

  test('shows the protected payment step and moves the reservation to custody', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-protected-1',
        propertyId: 'property-1',
        userId: 'user-1',
        status: 'confirmed',
        requestMode: 'protected',
        propertyTitle: 'Casa frente al bosque',
        location: 'Cariló',
        startDate: '2026-05-10',
        endDate: '2026-05-14',
        guests: 3,
        totalPrice: 520000,
        contractAccepted: false,
        contractJson: JSON.stringify({
          guestName: 'Ana',
          hostName: 'Mariana',
          propertyTitle: 'Casa frente al bosque',
          location: 'Cariló',
          rules: ['No fumar dentro de la propiedad'],
        }),
      },
    ]);
    payProtectedDepositMock.mockResolvedValue({
      id: 'booking-protected-1',
      propertyId: 'property-1',
      userId: 'user-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositStatus: 'held',
      propertyTitle: 'Casa frente al bosque',
      location: 'Cariló',
      startDate: '2026-05-10',
      endDate: '2026-05-14',
      guests: 3,
      totalPrice: 520000,
      contractAccepted: false,
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Solicitud aceptada')).not.toHaveLength(0);
    expect(screen.getByText('Podés avanzar con una reserva protegida.')).toBeInTheDocument();
    expect(screen.getAllByText('Pagar seña')).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /Pagar seña/i }));

    await waitFor(() => {
      expect(payProtectedDepositMock).toHaveBeenCalledWith('booking-protected-1');
    });

    expect(await screen.findAllByText('Seña en custodia')).not.toHaveLength(0);
    expect(screen.getByText('La seña se mantiene protegida hasta tu llegada.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Seña en custodia',
      'La seña ya quedó resguardada en la plataforma hasta que confirmes la llegada.',
      'success',
    );
  });

  test('lets the guest confirm arrival once the protected deposit is in custody', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-protected-2',
        propertyId: 'property-2',
        userId: 'user-1',
        status: 'confirmed',
        requestMode: 'protected',
        depositStatus: 'held',
        propertyTitle: 'Departamento luminoso',
        location: 'Belgrano',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        guests: 2,
        totalPrice: 410000,
        contractAccepted: true,
      },
    ]);
    confirmArrivalMock.mockResolvedValue({
      id: 'booking-protected-2',
      propertyId: 'property-2',
      userId: 'user-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositStatus: 'released',
      propertyTitle: 'Departamento luminoso',
      location: 'Belgrano',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      guests: 2,
      totalPrice: 410000,
      contractAccepted: true,
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar llegada/i }));

    await waitFor(() => {
      expect(confirmArrivalMock).toHaveBeenCalledWith('booking-protected-2');
    });

    expect(await screen.findAllByText('Seña liberada')).not.toHaveLength(0);
    expect(screen.getByText('La llegada ya quedó confirmada y la seña salió de custodia.')).toBeInTheDocument();
  });

  test('lets the guest report an arrival problem while the protected deposit is in custody', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-protected-3',
        propertyId: 'property-3',
        userId: 'user-1',
        status: 'confirmed',
        requestMode: 'protected',
        depositStatus: 'held',
        propertyTitle: 'Cabaña entre pinos',
        location: 'Villa La Angostura',
        startDate: '2026-07-11',
        endDate: '2026-07-16',
        guests: 2,
        totalPrice: 680000,
        contractAccepted: true,
      },
    ]);
    reportArrivalProblemMock.mockResolvedValue({
      id: 'booking-protected-3',
      propertyId: 'property-3',
      userId: 'user-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositStatus: 'review',
      propertyTitle: 'Cabaña entre pinos',
      location: 'Villa La Angostura',
      startDate: '2026-07-11',
      endDate: '2026-07-16',
      guests: 2,
      totalPrice: 680000,
      contractAccepted: true,
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Reportar problema/i }));

    await waitFor(() => {
      expect(reportArrivalProblemMock).toHaveBeenCalledWith('booking-protected-3');
    });

    expect(await screen.findAllByText('Seña en revisión')).not.toHaveLength(0);
    expect(screen.getByText('Quedó reportado un problema al llegar y la seña pasó a revisión.')).toBeInTheDocument();
    expect(screen.getByText('La plataforma revisa lo que pasó antes de definir cómo sigue la seña.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Seña en revisión',
      'El problema quedó informado y la seña pasó a revisión.',
      'success',
    );
  });

  test('keeps a protected guest cancellation visible with platform review guidance', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-guest-cancel-protected',
        propertyId: 'property-4',
        userId: 'user-1',
        status: 'confirmed',
        requestMode: 'protected',
        depositStatus: 'held',
        propertyTitle: 'Casa con quincho',
        location: 'Mar de las Pampas',
        startDate: '2099-09-10',
        endDate: '2099-09-15',
        guests: 4,
        totalPrice: 720000,
        contractAccepted: true,
      },
    ]);
    cancelBookingMock.mockResolvedValue({
      booking: {
        id: 'booking-guest-cancel-protected',
        propertyId: 'property-4',
        userId: 'user-1',
        status: 'cancelled',
        requestMode: 'protected',
        depositStatus: 'review',
        cancellationActor: 'guest',
      },
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Cancelar reserva/i }));

    await waitFor(() => {
      expect(cancelBookingMock).toHaveBeenCalledWith('booking-guest-cancel-protected');
    });

    expect(await screen.findAllByText('Cancelaste la reserva')).not.toHaveLength(0);
    expect(screen.getByText('La cancelación ya quedó registrada.')).toBeInTheDocument();
    expect(screen.getByText('La plataforma revisa qué pasa con la seña según la etapa de la reserva.')).toBeInTheDocument();
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
  });

  test('shows the protected host cancellation state with automatic refund guidance', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-host-cancelled',
        propertyId: 'property-5',
        userId: 'user-1',
        status: 'cancelled',
        requestMode: 'protected',
        depositStatus: 'refunded',
        cancellationActor: 'host',
        propertyTitle: 'Dúplex con terraza',
        location: 'Colegiales',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        guests: 2,
        totalPrice: 390000,
        contractAccepted: true,
      },
    ]);

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Canceló el anfitrión')).not.toHaveLength(0);
    expect(screen.getByText('La reserva ya no sigue activa.')).toBeInTheDocument();
    expect(screen.getByText('La seña se devuelve automáticamente.')).toBeInTheDocument();
    expect(screen.getByText('Devolver seña')).toBeInTheDocument();
  });

  test('cancels a future reservation and updates the status in place', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-2',
        propertyId: 'property-2',
        userId: 'user-1',
        status: 'confirmed',
        propertyTitle: 'Casa con patio',
        location: 'Villa Urquiza',
        startDate: '2099-08-10',
        endDate: '2099-08-14',
        guests: 3,
        totalPrice: 480000,
        contractAccepted: true,
      },
    ]);
    cancelBookingMock.mockResolvedValue({
      booking: {
        id: 'booking-2',
        status: 'cancelled',
      },
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Cancelar reserva/i }));

    await waitFor(() => {
      expect(cancelBookingMock).toHaveBeenCalledWith('booking-2');
    });

    expect(await screen.findByText('Reserva cancelada')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Reserva cancelada',
      'La reserva se canceló y las fechas volvieron a quedar disponibles.',
      'success',
    );
  });

  test('hides the cancel action when the reservation is already inside the 24-hour window', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isoTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const cancellationDeadlineLabel = formatBookingDateTime(getCancellationDeadlineFromStartDate(isoTomorrow));

    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-3',
        propertyId: 'property-3',
        userId: 'user-1',
        status: 'confirmed',
        propertyTitle: 'Monoambiente céntrico',
        location: 'Centro',
        startDate: isoTomorrow,
        endDate: '2099-08-16',
        guests: 1,
        totalPrice: 120000,
        contractAccepted: true,
      },
    ]);

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByText(`La cancelación online estuvo disponible hasta el ${cancellationDeadlineLabel}. Si necesitás ayuda, escribile al anfitrión cuanto antes.`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar reserva/i })).not.toBeInTheDocument();
  });
});