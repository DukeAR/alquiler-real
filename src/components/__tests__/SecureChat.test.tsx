import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const useAuthMock = vi.fn();
const fetchConversationsMock = vi.fn();
const fetchMessagesMock = vi.fn();
const sendMessageMock = vi.fn();
const acceptConversationRequestMock = vi.fn();
const reportDirectDepositMock = vi.fn();
const confirmDirectDepositMock = vi.fn();
const payProtectedDepositMock = vi.fn();
const confirmArrivalMock = vi.fn();
const reportArrivalProblemMock = vi.fn();
const showToastMock = vi.fn();

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

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../services/geminiService', () => ({
  fetchConversations: (...args: unknown[]) => fetchConversationsMock(...args),
  fetchMessages: (...args: unknown[]) => fetchMessagesMock(...args),
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  acceptConversationRequest: (...args: unknown[]) => acceptConversationRequestMock(...args),
  reportDirectDeposit: (...args: unknown[]) => reportDirectDepositMock(...args),
  confirmDirectDeposit: (...args: unknown[]) => confirmDirectDepositMock(...args),
  payProtectedDeposit: (...args: unknown[]) => payProtectedDepositMock(...args),
  confirmArrival: (...args: unknown[]) => confirmArrivalMock(...args),
  reportArrivalProblem: (...args: unknown[]) => reportArrivalProblemMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

vi.mock('../ReportModal', () => ({
  ReportModal: () => <div>ReportModal</div>,
}));

import { SecureChat } from '../SecureChat';

const baseConversation = {
  id: 'conv-1',
  property_id: 'prop-1',
  tenant_id: 'tenant-1',
  host_id: 'host-1',
  tenantName: 'Lucía',
  hostName: 'Mariana',
  propertyTitle: 'Casa de prueba',
  propertyImage: 'https://example.com/property.jpg',
  hostTrustScore: 3,
  hostTrust: {
    score: 3,
    level: 'medium',
    items: [
      { key: 'identity', label: 'Identidad confirmada', description: 'Identidad ya confirmada.', status: 'complete' },
      { key: 'reservations', label: 'Historial de reservas', description: '6 reservas completadas.', status: 'complete' },
      { key: 'reviews', label: 'Reseñas de huéspedes', description: '4 reseñas de huéspedes.', status: 'complete' },
      { key: 'tenure', label: 'Antigüedad en la plataforma', description: 'Todavía no hay antigüedad suficiente para evaluarlo.', status: 'pending' },
    ],
  },
  updated_at: '2026-04-06T12:00:00.000Z',
  created_at: '2026-04-06T11:00:00.000Z',
};

const renderChat = () => {
  render(
    <MemoryRouter initialEntries={['/chat/conv-1']}>
      <Routes>
        <Route path="/chat/:id" element={<SecureChat initialConversationId="conv-1" />} />
        <Route path="/my-bookings" element={<div>Ruta Mis reservas</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('SecureChat', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    fetchConversationsMock.mockReset();
    fetchMessagesMock.mockReset();
    sendMessageMock.mockReset();
    acceptConversationRequestMock.mockReset();
    reportDirectDepositMock.mockReset();
    confirmDirectDepositMock.mockReset();
    payProtectedDepositMock.mockReset();
    confirmArrivalMock.mockReset();
    reportArrivalProblemMock.mockReset();
    showToastMock.mockReset();
  });

  test('lets the guest report a direct deposit from an inline system message in the thread', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'accepted',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    reportDirectDepositMock.mockResolvedValue({
      ...baseConversation,
      requestMode: 'direct',
      requestStatus: 'accepted',
      depositStatus: 'reported',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      requestGuests: 2,
      requestTotalPrice: 320000,
    });

    renderChat();

    expect(await screen.findByText('Ya pueden avanzar con la seña de esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('La reserva sigue pendiente hasta que se confirme la seña.')).toBeInTheDocument();
    expect(screen.getByText('Revisá que el titular coincida con quien publica antes de transferir.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Informar seña/i }));

    await waitFor(() => {
      expect(reportDirectDepositMock).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findByText('El huésped informó la seña. Falta confirmar la recepción.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Informar seña/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Coordinar llegada/i })).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Seña informada',
      'El anfitrión ya ve que informaste la seña y puede confirmar la recepción.',
      'success',
    );
  });

  test('renders automatic system guidance messages inside the chat thread', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'pending',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([
      {
        id: 'msg-system-1',
        conversation_id: 'conv-1',
        sender_id: 'host-1',
        receiver_id: 'tenant-1',
        content: 'Podés hacer todas las preguntas necesarias antes de avanzar.',
        is_system: true,
        created_at: '2026-04-06T11:05:00.000Z',
      },
      {
        id: 'msg-system-2',
        conversation_id: 'conv-1',
        sender_id: 'host-1',
        receiver_id: 'tenant-1',
        content: 'Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.',
        is_system: true,
        created_at: '2026-04-06T11:06:00.000Z',
      },
    ]);

    renderChat();

    expect(await screen.findByText('Podés hacer todas las preguntas necesarias antes de avanzar.')).toBeInTheDocument();
    expect(screen.getByText('Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.')).toBeInTheDocument();
  });

  test('renders a compact header with host verification and a single-line booking context', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'pending',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByRole('heading', { name: 'Mariana' })).toBeInTheDocument();
    expect(screen.getByText('✔ Identidad verificada · ✔ Historial · ✔ Reseñas')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Casa de prueba') && content.includes('2 huéspedes') && content.includes('320'))).toBeInTheDocument();
    expect(screen.queryByText('Estado actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Actúa ahora')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximo paso')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Te sirven estas fechas?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Qué incluye el precio?' })).toBeInTheDocument();
  });

  test('falls back to the only available conversation when the initial id no longer matches', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        id: 'conv-real',
        requestMode: 'direct',
        requestStatus: 'pending',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/chat/conv-stale']}>
        <Routes>
          <Route path="/chat/:id" element={<SecureChat initialConversationId="conv-stale" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchMessagesMock).toHaveBeenCalledWith('conv-real');
    });
    expect(screen.queryByText('Elegí una conversación para ver el historial')).not.toBeInTheDocument();
  });

  test('opens the only available conversation by default on the chat inbox route', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        id: 'conv-real',
        requestMode: 'direct',
        requestStatus: 'pending',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/chat/all']}>
        <Routes>
          <Route path="/chat/all" element={<SecureChat />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchMessagesMock).toHaveBeenCalledWith('conv-real');
    });
    expect(screen.queryByText('Elegí una conversación para ver el historial')).not.toBeInTheDocument();
  });

  test('advances a protected reservation from an inline payment step in the thread', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(4);

    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-1',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        requestStartDate: arrivalDate,
        requestEndDate: departureDate,
        requestGuests: 3,
        requestTotalPrice: 540000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    payProtectedDepositMock.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositStatus: 'held',
    });

    renderChat();

    expect(await screen.findByText((content) => content.includes('Ya podés avanzar con una reserva protegida.') && content.includes('La seña queda en custodia y se libera cuando confirmás tu llegada.'))).toBeInTheDocument();
    expect(screen.getByText('La reserva sigue pendiente hasta que se confirme la seña.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pagar seña/i }));

    await waitFor(() => {
      expect(payProtectedDepositMock).toHaveBeenCalledWith('booking-1');
    });

    expect(await screen.findByText('La seña quedó en custodia. Se libera cuando se confirme la llegada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar llegada/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coordinar llegada/i })).toBeInTheDocument();
  });

  test('shows the host-specific custody message when the protected deposit is already held', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-held-1',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-14',
        requestGuests: 2,
        requestTotalPrice: 410000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByText('La seña quedó en custodia. Se libera cuando se confirme la llegada.')).toBeInTheDocument();
    expect(screen.getByText('Vas a poder ver el estado y el momento de liberación desde esta reserva.')).toBeInTheDocument();
    expect(screen.getAllByText('Coordinar llegada').length).toBeGreaterThan(0);
  });

  test('shows the 24 hour response deadline and inactivity guidance when a pending protected request expires', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'protected',
        requestStatus: 'pending',
        requestCreatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findAllByText('Solicitud vencida')).not.toHaveLength(0);
    expect(screen.getByText('La solicitud venció porque no hubo respuesta dentro del plazo.')).toBeInTheDocument();
    expect(screen.getByText('Si todavía querés avanzar, mandá otro mensaje o abrí una nueva solicitud.')).toBeInTheDocument();
    expect(screen.getByText(/El plazo de respuesta terminó/i)).toBeInTheDocument();
    expect(screen.getByText('Todavía no hubo respuesta. Podés enviar otro mensaje o ver otras opciones.')).toBeInTheDocument();
  });

  test('shows an expired protected request as closed for the host and removes the accept CTA', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'protected',
        requestStatus: 'pending',
        requestCreatedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findAllByText('Solicitud vencida')).not.toHaveLength(0);
    expect(screen.getByText('La solicitud venció porque no se respondió dentro del plazo.')).toBeInTheDocument();
    expect(screen.getByText('Si todavía quieren avanzar, el huésped tiene que abrir una nueva solicitud.')).toBeInTheDocument();
    expect(screen.getByText(/Esta solicitud venció/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceptar solicitud/i })).not.toBeInTheDocument();
  });

  test('lets the guest report an arrival problem from the protected chat summary', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(4);

    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-2',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        requestStartDate: arrivalDate,
        requestEndDate: departureDate,
        requestGuests: 2,
        requestTotalPrice: 430000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    reportArrivalProblemMock.mockResolvedValue({
      id: 'booking-2',
      status: 'confirmed',
      requestMode: 'protected',
      depositStatus: 'review',
    });

    renderChat();

    fireEvent.click(await screen.findByRole('button', { name: /Reportar problema/i }));

    await waitFor(() => {
      expect(reportArrivalProblemMock).toHaveBeenCalledWith('booking-2');
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

  test('keeps arrival actions locked until the check-in day for protected stays already in custody', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-3',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        requestStartDate: getRelativeArgentinaDate(5),
        requestEndDate: getRelativeArgentinaDate(8),
        requestGuests: 2,
        requestTotalPrice: 390000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByText('La seña quedó en custodia. Se libera cuando se confirme la llegada.')).toBeInTheDocument();
    expect(screen.getByText('Confirmar llegada o reportar un problema se habilitan el día del ingreso.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar llegada/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportar problema/i })).not.toBeInTheDocument();
  });

  test('lets the host accept a pending request and updates the chat context', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'pending',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'msg-system-1',
          conversation_id: 'conv-1',
          sender_id: 'host-1',
          receiver_id: 'tenant-1',
          content: 'Ya pueden avanzar con la seña de esta reserva.',
          is_system: true,
          system_key: 'request-accepted',
          created_at: '2026-04-06T12:10:00.000Z',
        },
      ]);
    acceptConversationRequestMock.mockResolvedValue({
      ...baseConversation,
      requestMode: 'direct',
      requestStatus: 'accepted',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      requestGuests: 2,
      requestTotalPrice: 320000,
    });

    renderChat();

    fireEvent.click(await screen.findByRole('button', { name: /Aceptar propuesta/i }));

    await waitFor(() => {
      expect(acceptConversationRequestMock).toHaveBeenCalledWith('conv-1');
    });

    expect(screen.queryByRole('button', { name: /Aceptar propuesta/i })).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Propuesta aceptada',
      'La propuesta ya quedó aceptada. El siguiente paso es que el huésped informe la seña por chat.',
      'success',
    );
  });

  test('lets the host confirm a reported direct deposit from an inline system message in the thread', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'accepted',
        depositStatus: 'reported',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    confirmDirectDepositMock.mockResolvedValue({
      ...baseConversation,
      booking_id: 'booking-1',
      bookingStatus: 'confirmed',
      requestMode: 'direct',
      requestStatus: 'accepted',
      depositStatus: 'confirmed',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      requestGuests: 2,
      requestTotalPrice: 320000,
    });

    renderChat();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar recepción/i }));

    await waitFor(() => {
      expect(confirmDirectDepositMock).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findAllByText('Reserva confirmada')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /Coordinar llegada/i })).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Reserva confirmada',
      'La seña ya quedó confirmada y la reserva sigue por chat con los últimos detalles.',
      'success',
    );
  });
});