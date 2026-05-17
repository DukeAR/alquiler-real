import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { formatBookingDateTime, getCancellationDeadlineFromStartDate } from '../../lib/bookingDates';

const apiJsonMock = vi.fn();
const acceptContractMock = vi.fn();
const cancelBookingMock = vi.fn();
const selectExternalDepositMock = vi.fn();
const selectProtectedDepositMock = vi.fn();
const payProtectedDepositMock = vi.fn();
const confirmArrivalMock = vi.fn();
const reportArrivalProblemMock = vi.fn();
const showToastMock = vi.fn();
const setActiveModeMock = vi.fn();

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const getRelativeArgentinaDate = (offsetDays: number) => {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
};

const mockDashboardApi = ({
  bookings = [],
  favorites = [],
  conversations = [],
}: {
  bookings?: unknown[];
  favorites?: unknown[];
  conversations?: unknown[];
}) => {
  apiJsonMock.mockImplementation((url: string) => {
    if (url === '/api/bookings/all') {
      return Promise.resolve(bookings);
    }

    if (url === '/api/favorites') {
      return Promise.resolve(favorites);
    }

    if (url === '/api/conversations') {
      return Promise.resolve(conversations);
    }

    return Promise.resolve([]);
  });
};

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../services/geminiService', () => ({
  acceptContract: (...args: unknown[]) => acceptContractMock(...args),
  cancelBooking: (...args: unknown[]) => cancelBookingMock(...args),
  selectExternalDeposit: (...args: unknown[]) => selectExternalDepositMock(...args),
  selectProtectedDeposit: (...args: unknown[]) => selectProtectedDepositMock(...args),
  payProtectedDeposit: (...args: unknown[]) => payProtectedDepositMock(...args),
  confirmArrival: (...args: unknown[]) => confirmArrivalMock(...args),
  reportArrivalProblem: (...args: unknown[]) => reportArrivalProblemMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      activeMode: 'host',
      canGuest: true,
      canHost: true,
    },
    setActiveMode: setActiveModeMock,
  }),
}));

vi.mock('../ui/AccountModeSwitch', () => ({
  AccountModeSwitch: () => <div>Mode switch</div>,
}));

import { MyBookings } from '../MyBookings';

describe('MyBookings', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    acceptContractMock.mockReset();
    cancelBookingMock.mockReset();
    selectExternalDepositMock.mockReset();
    selectProtectedDepositMock.mockReset();
    payProtectedDepositMock.mockReset();
    confirmArrivalMock.mockReset();
    reportArrivalProblemMock.mockReset();
    showToastMock.mockReset();
    setActiveModeMock.mockReset();
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
    expect(apiJsonMock.mock.calls.filter((call) => call[0] === '/api/bookings/all')).toHaveLength(2);
  });

  test('switches the account mode back to guest when opening the guest dashboard', async () => {
    mockDashboardApi({ bookings: [] });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    await screen.findByText('Todavía no tenés reservas');

    expect(setActiveModeMock).toHaveBeenCalledWith('guest');
  });

  test('shows the guest control center hierarchy with reservations, saved properties and conversations', async () => {
    const arrivalDate = getRelativeArgentinaDate(10);
    const departureDate = getRelativeArgentinaDate(14);
    const now = new Date().toISOString();

    mockDashboardApi({
      bookings: [
        {
          id: 'booking-dashboard-1',
          propertyId: 'property-1',
          userId: 'user-1',
          conversationId: 'conv-dashboard-1',
          status: 'confirmed',
          requestMode: 'protected',
          depositStatus: 'held',
          propertyTitle: 'Casa en la laguna',
          location: 'Chascomús',
          startDate: arrivalDate,
          endDate: departureDate,
          guests: 2,
          totalPrice: 320000,
          contractAccepted: true,
        },
      ],
      favorites: [
        {
          id: 'saved-property-1',
          title: 'Loft con terraza',
          location: 'Colegiales',
          imageUrl: 'https://example.com/loft.jpg',
          price: 210000,
          identityValidated: true,
          locationVerified: true,
          videoValidated: true,
          propertyRelationshipVerified: false,
          hasPresencialVerification: false,
        },
      ],
      conversations: [
        {
          id: 'conv-dashboard-1',
          property_id: 'property-1',
          tenant_id: 'user-1',
          host_id: 'host-1',
          hostName: 'Marina',
          propertyTitle: 'Casa en la laguna',
          last_message: 'Quedó pendiente coordinar el horario de llegada.',
          bookingStatus: 'confirmed',
          requestMode: 'protected',
          depositStatus: 'held',
          updated_at: now,
          created_at: now,
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tus reservas, tus chats y tu próximo paso en un solo lugar.')).toBeInTheDocument();
    expect(screen.getByText('Solicitudes pendientes')).toBeInTheDocument();
    expect(screen.getByText('Reservas activas')).toBeInTheDocument();
    expect(screen.getByText('Chats para retomar')).toBeInTheDocument();
    expect(screen.getByText('Qué conviene hacer ahora')).toBeInTheDocument();
    expect(screen.getAllByText('Guardados útiles')).not.toHaveLength(0);
    expect(screen.getAllByText('Conversaciones')).not.toHaveLength(0);
    expect(await screen.findByText('Loft con terraza')).toBeInTheDocument();
    expect(await screen.findByLabelText('Información publicada por el anfitrión')).toBeInTheDocument();
    expect(await screen.findByText('Quedó pendiente coordinar el horario de llegada.')).toBeInTheDocument();
  });

  test('keeps completed direct reservations out of pending requests and shows them as finalizadas', async () => {
    mockDashboardApi({
      bookings: [
        {
          id: 'booking-completed-direct',
          propertyId: 'property-closed-1',
          userId: 'user-1',
          conversationId: 'conv-closed-1',
          status: 'completed',
          requestMode: 'direct',
          propertyTitle: 'PH con patio y parrilla en calle tranquila',
          location: 'Costa del Este',
          startDate: getRelativeArgentinaDate(-28),
          endDate: getRelativeArgentinaDate(-24),
          guests: 2,
          totalPrice: 188000,
          contractAccepted: true,
          guestReviewSubmitted: true,
        },
      ],
      conversations: [
        {
          id: 'conv-closed-1',
          property_id: 'property-closed-1',
          tenant_id: 'user-1',
          host_id: 'host-1',
          hostName: 'Valeria',
          propertyTitle: 'PH con patio y parrilla en calle tranquila',
          last_message: 'Gracias por la estadía.',
          bookingStatus: 'completed',
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No tenés solicitudes abiertas ahora.')).toBeInTheDocument();
    expect(screen.getAllByText('Operación completada').length).toBeGreaterThan(0);
    expect(screen.getByText('Revisar el cierre')).toBeInTheDocument();
    expect(screen.queryByText('Propuesta enviada')).toBeNull();
    expect(screen.queryByText('Esperar respuesta')).toBeNull();
  });

  test('shows not advanced requests as closed reservations with the explicit next-step copy', async () => {
    mockDashboardApi({
      bookings: [
        {
          id: 'booking-not-advanced',
          propertyId: 'property-1',
          userId: 'user-1',
          conversationId: 'conv-not-advanced',
          status: 'cancelled',
          requestMode: 'protected',
          requestStatus: 'not_advanced',
          propertyTitle: 'Casa frente al bosque',
          location: 'Pinamar',
          startDate: getRelativeArgentinaDate(18),
          endDate: getRelativeArgentinaDate(21),
          guests: 2,
          totalPrice: 240000,
        },
      ],
      conversations: [
        {
          id: 'conv-not-advanced',
          property_id: 'property-1',
          tenant_id: 'user-1',
          host_id: 'host-1',
          hostName: 'Valeria',
          propertyTitle: 'Casa frente al bosque',
          last_message: 'La solicitud no avanzó.',
          bookingStatus: 'cancelled',
          requestMode: 'protected',
          requestStatus: 'not_advanced',
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Operaciones completadas')).toBeInTheDocument();
    expect(screen.getAllByText('No avanzó').length).toBeGreaterThan(0);
    expect(screen.getByText('No se pudo avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('El anfitrión no puede avanzar en este momento. Podés seguir conversando o buscar otras opciones.')).toBeInTheDocument();
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

    expect(await screen.findByText('Responsabilidad y alcance de la plataforma')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Aceptar condiciones/i }));

    expect(screen.getByText(/Ya podés coordinar tranquilo la llegada por el chat/i)).toBeInTheDocument();
    expect(screen.getByText('Próximo paso: coordiná horario y llegada con el anfitrión por el chat.')).toBeInTheDocument();

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

  test('shows the protected base state without payment actions', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-protected-1',
        propertyId: 'property-1',
        userId: 'user-1',
        conversationId: 'conv-protected-1',
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
    selectProtectedDepositMock.mockResolvedValue({
      id: 'booking-protected-1',
      propertyId: 'property-1',
      userId: 'user-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositType: 'protected',
      propertyTitle: 'Casa frente al bosque',
      location: 'Cariló',
      startDate: '2026-05-10',
      endDate: '2026-05-14',
      guests: 3,
      totalPrice: 520000,
      contractAccepted: false,
    });
    payProtectedDepositMock.mockResolvedValue({
      booking: {
        id: 'booking-protected-1',
        propertyId: 'property-1',
        userId: 'user-1',
        status: 'confirmed',
        requestMode: 'protected',
        depositType: 'protected',
        depositStatus: 'held',
        propertyTitle: 'Casa frente al bosque',
        location: 'Cariló',
        startDate: '2026-05-10',
        endDate: '2026-05-14',
        guests: 3,
        totalPrice: 520000,
        contractAccepted: false,
      },
      checkoutUrl: 'https://example.com/checkout/booking-protected-1',
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Seña Protegida')).not.toHaveLength(0);
    expect(screen.getByText('Timeline operativo')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente seña')).not.toBeInTheDocument();
    expect(screen.getByText('La reserva ya quedó marcada con seña protegida. Cuando la seña se registre, queda retenida hasta check-in. Por ahora solo ves el costo por protección de operación y el estado base: el cobro todavía no se procesa dentro de la app.')).toBeInTheDocument();
    expect(screen.getByText('Alcance de la seña protegida')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Abrir chat/i }).length).toBeGreaterThan(0);
    expect(selectExternalDepositMock).not.toHaveBeenCalled();
    expect(selectProtectedDepositMock).not.toHaveBeenCalled();
    expect(payProtectedDepositMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Coordinar por chat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usar Seña Protegida/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pagar seña/i })).not.toBeInTheDocument();
  });

  test('keeps a visible return to protected deposit after external coordination is selected', async () => {
    mockDashboardApi({
      bookings: [
        {
          id: 'booking-external-1',
          propertyId: 'property-3',
          userId: 'user-1',
          conversationId: 'conv-external-1',
          status: 'confirmed',
          requestMode: 'protected',
          depositType: 'external',
          depositStatus: 'external_pending',
          propertyTitle: 'PH con patio interno',
          location: 'Villa Crespo',
          startDate: '2026-08-10',
          endDate: '2026-08-14',
          guests: 2,
          totalPrice: 410000,
          contractAccepted: false,
        },
      ],
    });
    selectProtectedDepositMock.mockResolvedValue({
      id: 'booking-external-1',
      propertyId: 'property-3',
      userId: 'user-1',
      conversationId: 'conv-external-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositType: 'protected',
      depositStatus: null,
      propertyTitle: 'PH con patio interno',
      location: 'Villa Crespo',
      startDate: '2026-08-10',
      endDate: '2026-08-14',
      guests: 2,
      totalPrice: 410000,
      contractAccepted: false,
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /Usar Seña Protegida/i })).toBeInTheDocument();
    expect(screen.getByText('La Seña Protegida cubre casos relacionados con inexistencia del inmueble o imposibilidad de acceso.')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Solo aplica cuando elegís Seña Protegida y se muestra antes de confirmar.',
        { selector: 'p' },
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Usar Seña Protegida/i }));

    await waitFor(() => {
      expect(selectProtectedDepositMock).toHaveBeenCalledWith('booking-external-1');
    });

    expect(showToastMock).toHaveBeenCalledWith(
      'Seña Protegida',
      'La reserva quedó lista para registrar una seña protegida. Vas a ver el costo por protección de operación antes de pagar.',
      'success',
    );
  });

  test('opens the linked chat from a reservation card', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-chat-1',
        propertyId: 'property-9',
        userId: 'user-1',
        conversationId: 'conv-chat-1',
        status: 'confirmed',
        propertyTitle: 'Loft con patio interno',
        location: 'Colegiales',
        startDate: '2099-09-10',
        endDate: '2099-09-14',
        guests: 2,
        totalPrice: 360000,
        contractAccepted: true,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <Routes>
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/chat/:id" element={<div>Chat abierto</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const [openChatButton] = await screen.findAllByRole('button', { name: /Abrir chat/i });

    fireEvent.click(openChatButton);

    expect(await screen.findByText('Chat abierto')).toBeInTheDocument();
  });

  test('lets the guest confirm arrival once the protected deposit is in custody', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(4);

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
        startDate: arrivalDate,
        endDate: departureDate,
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
      depositStatus: 'held',
      guestCheckinConfirmed: true,
      hostAccessConfirmed: false,
      propertyTitle: 'Departamento luminoso',
      location: 'Belgrano',
      startDate: arrivalDate,
      endDate: departureDate,
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

    expect(await screen.findAllByText('Check-in confirmado')).not.toHaveLength(0);
    expect(screen.getAllByText('Ya registraste que llegaste a la propiedad.')).not.toHaveLength(0);
    expect(screen.getAllByText('Ahora falta que el anfitrión confirme el acceso para dejar la seña lista para liberarse al anfitrión.')).not.toHaveLength(0);
    expect(showToastMock).toHaveBeenCalledWith(
      'Ingreso confirmado',
      'Tu confirmación ya quedó registrada. Ahora falta que el anfitrión confirme el acceso para dejar la seña lista para liberarse al anfitrión.',
      'success',
    );
  });

  test('lets the guest report an arrival problem while the protected deposit is in custody', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(5);

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
        startDate: arrivalDate,
        endDate: departureDate,
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
      depositStatus: 'manual_review',
      depositPaymentReference: 'dep-ref-123',
      manualReviewReason: 'guest_checkin_without_host_access_confirmation',
      manualReviewOpenedAt: '2026-09-14T14:35:00.000Z',
      guestCheckinConfirmed: true,
      guestCheckinConfirmedAt: '2026-09-14T14:10:00.000Z',
      guestCheckinLatitude: -34.6037,
      guestCheckinLongitude: -58.3816,
      guestCheckinAccuracyMeters: 18,
      hostAccessConfirmed: false,
      propertyTitle: 'Cabaña entre pinos',
      location: 'Villa La Angostura',
      startDate: arrivalDate,
      endDate: departureDate,
      guests: 2,
      totalPrice: 680000,
      contractAccepted: true,
    });

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Reportar un problema/i }));

    await waitFor(() => {
      expect(reportArrivalProblemMock).toHaveBeenCalledWith('booking-protected-3');
    });

    expect(await screen.findAllByText('En revisión manual')).not.toHaveLength(0);
  expect(screen.getAllByText('Vamos a revisar la información disponible: chat, comprobante, confirmaciones y ubicación registrada.')).not.toHaveLength(0);
    expect(screen.getByText('El huésped confirmó la llegada pero falta la confirmación de acceso del anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Referencia dep-ref-123')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'En revisión manual',
      'El problema quedó informado y la seña pasó a revisión manual.',
      'success',
    );
  });

  test('explains that arrival actions unlock on the check-in day when the deposit is already in custody', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'booking-protected-future',
        propertyId: 'property-7',
        userId: 'user-1',
        status: 'confirmed',
        requestMode: 'protected',
        depositStatus: 'held',
        propertyTitle: 'Casa junto al bosque',
        location: 'Cariló',
        startDate: getRelativeArgentinaDate(6),
        endDate: getRelativeArgentinaDate(9),
        guests: 2,
        totalPrice: 560000,
        contractAccepted: true,
      },
    ]);

    render(
      <MemoryRouter>
        <MyBookings />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Seña confirmada')).not.toHaveLength(0);
    expect(screen.getByText('Las confirmaciones del ingreso se habilitan desde el día del check-in.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar llegada/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportar problema/i })).not.toBeInTheDocument();
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
        depositStatus: 'manual_review',
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
    expect(screen.getByText('La devolución depende del momento de la cancelación y de cómo quedó la reserva. La seña está en revisión hasta cerrar qué corresponde.')).toBeInTheDocument();
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
    expect(screen.getByText('Si la seña ya estaba en custodia, se devuelve.')).toBeInTheDocument();
    expect(screen.getByText('Esperar devolución')).toBeInTheDocument();
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