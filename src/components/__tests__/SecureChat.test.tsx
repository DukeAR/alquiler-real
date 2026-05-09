import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const useAuthMock = vi.fn();
const fetchConversationsMock = vi.fn();
const fetchMessagesMock = vi.fn();
const sendMessageMock = vi.fn();
const acceptConversationRequestMock = vi.fn();
const notAdvanceConversationRequestMock = vi.fn();
const reportDirectDepositMock = vi.fn();
const confirmDirectDepositMock = vi.fn();
const selectExternalDepositMock = vi.fn();
const selectProtectedDepositMock = vi.fn();
const payProtectedDepositMock = vi.fn();
const confirmAccessMock = vi.fn();
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
  notAdvanceConversationRequest: (...args: unknown[]) => notAdvanceConversationRequestMock(...args),
  reportDirectDeposit: (...args: unknown[]) => reportDirectDepositMock(...args),
  confirmDirectDeposit: (...args: unknown[]) => confirmDirectDepositMock(...args),
  selectExternalDeposit: (...args: unknown[]) => selectExternalDepositMock(...args),
  selectProtectedDeposit: (...args: unknown[]) => selectProtectedDepositMock(...args),
  payProtectedDeposit: (...args: unknown[]) => payProtectedDepositMock(...args),
  confirmAccess: (...args: unknown[]) => confirmAccessMock(...args),
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
  propertyPrice: 120000,
  hostMemberSince: '2022-02-10',
  hostTrust: {
    score: 4,
    level: 'high',
    items: [
      { key: 'identity', label: 'Identidad validada', description: 'La identidad del anfitrión ya fue validada.', status: 'complete' },
      { key: 'onsite', label: 'Verificación presencial', description: 'Todavía no hay una verificación presencial registrada.', status: 'pending' },
      { key: 'response', label: 'Responde en ~18 min', description: 'Promedio de primera respuesta visible: ~18 min.', status: 'complete' },
      { key: 'operations', label: '6 operaciones completadas', description: '6 operaciones completadas dentro de la plataforma.', status: 'complete' },
      { key: 'tenure', label: '4 años en la plataforma', description: '4 años en la plataforma.', status: 'complete' },
    ],
  },
  hostInteractionHistory: {
    completedReservationsCount: 6,
    feedbackCount: 4,
    agreementsKeptCount: 4,
    listingConsistentCount: 4,
    wouldInteractAgainCount: 4,
    incidentsCount: 0,
    avgResponseTimeMinutes: 18,
    publicSignals: [
      { key: 'completed-reservations', label: '6 reservas completadas', tone: 'positive' },
      { key: 'listing-consistency', label: 'El aviso suele coincidir con lo publicado', tone: 'positive' },
      { key: 'response-time', label: 'Responde en alrededor de 18 min', tone: 'positive' },
    ],
  },
  updated_at: '2026-04-06T12:00:00.000Z',
  created_at: '2026-04-06T11:00:00.000Z',
};

const baseGuestProfile = {
  identityVerified: false,
  platformHistory: {
    completedStays: 4,
    conflictsCount: 0,
    cancellationsCount: 0,
  },
  profileCompletion: {
    profileComplete: false,
    photoUploaded: false,
    basicDetailsComplete: true,
  },
  interactionHistory: {
    completedStays: 4,
    feedbackCount: 2,
    agreementsKeptCount: 2,
    wouldInteractAgainCount: 2,
    incidentsCount: 0,
    publicSignals: [
      { key: 'agreements', label: 'Se cumplió lo acordado', tone: 'positive' },
      { key: 'return', label: 'Volverían a interactuar', tone: 'positive' },
    ],
  },
  verificationSummary: {
    score: 3,
    maxScore: 5,
    items: [
      { key: 'email', label: 'Email verificado', status: 'complete' },
      { key: 'phone', label: 'Teléfono verificado', status: 'complete' },
      { key: 'profile', label: 'Perfil completo', status: 'pending' },
      { key: 'history', label: 'Historial real en la plataforma', status: 'complete' },
      { key: 'documentary', label: 'Identidad documental', status: 'pending' },
    ],
  },
  memberSince: '2024-01-10',
};

const renderChat = () => {
  render(
    <MemoryRouter initialEntries={['/chat/conv-1']}>
      <Routes>
        <Route path="/chat/:id" element={<SecureChat initialConversationId="conv-1" />} />
        <Route path="/my-bookings" element={<div>Ruta Mis reservas</div>} />
        <Route path="/explore" element={<div>Ruta Explorar</div>} />
        <Route path="/detail/:id" element={<div>Ruta detalle propiedad</div>} />
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
    notAdvanceConversationRequestMock.mockReset();
    reportDirectDepositMock.mockReset();
    confirmDirectDepositMock.mockReset();
    selectExternalDepositMock.mockReset();
    selectProtectedDepositMock.mockReset();
    payProtectedDepositMock.mockReset();
    confirmAccessMock.mockReset();
    confirmArrivalMock.mockReset();
    reportArrivalProblemMock.mockReset();
    showToastMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('uses a slower foreground polling cadence for messages', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

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

    await waitFor(() => {
      expect(fetchMessagesMock).toHaveBeenCalledTimes(1);
    });

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15_000);
  });

  test('lets the guest report a direct deposit from an inline system message in a legacy booking-backed flow', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-direct-legacy-1',
        bookingStatus: 'confirmed',
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
      booking_id: 'booking-direct-legacy-1',
      bookingStatus: 'confirmed',
      requestMode: 'direct',
      requestStatus: 'accepted',
      depositStatus: 'reported',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      requestGuests: 2,
      requestTotalPrice: 320000,
    });

    renderChat();

    expect(await screen.findByText('Ya están de acuerdo.')).toBeInTheDocument();
    expect(screen.getByText('Si ya resolvieron algo por fuera dentro de un flujo viejo, podés dejarlo asentado por acá.')).toBeInTheDocument();
    expect(screen.getByText('Estado: Operación libre')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Registrar seña/i }));

    await waitFor(() => {
      expect(reportDirectDepositMock).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findByText('Estado: Esperando confirmación del anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Ahora el anfitrión tiene que confirmar la recepción.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar seña/i })).not.toBeInTheDocument();
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
        interactionContinuity: {
          label: 'Ya interactuaron antes sin inconvenientes',
          detail: 'Ya tuvieron una coordinación cerrada sin incidentes y pueden retomar desde una base conocida.',
          sharedCompletedBookings: 1,
        },
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
        content: 'Podés coordinar todo por acá. Cuando lo acuerden, después pueden avanzar con la seña.',
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

    expect((await screen.findAllByText('Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.')).length).toBeGreaterThan(0);
  });

  test('does not infer a protected deposit step from booking_id alone when a direct booking is already confirmed', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-1',
        bookingStatus: 'confirmed',
        requestStartDate: getRelativeArgentinaDate(7),
        requestEndDate: getRelativeArgentinaDate(11),
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([
      {
        id: 'msg-system-conversation-start',
        conversation_id: 'conv-1',
        sender_id: 'host-1',
        receiver_id: 'tenant-1',
        content: 'Podés hablar y cerrar todo por acá. Cuando lo acuerden, después pueden avanzar con la seña.',
        is_system: true,
        system_key: 'conversation-start',
        created_at: '2026-04-06T11:05:00.000Z',
      },
    ]);

    renderChat();

    expect(await screen.findByText('Estado: Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Todo listo para esas fechas')).toBeInTheDocument();
    expect(screen.queryByText('Podés hablar y cerrar todo por acá. Cuando lo acuerden, después pueden avanzar con la seña.')).not.toBeInTheDocument();
    expect(screen.queryByText('Estado: Pendiente seña')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar seña/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pagar seña/i })).not.toBeInTheDocument();
  });

  test('shows a subtle account reminder when transfer keywords appear in the chat', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        interactionContinuity: {
          label: 'Ya interactuaron antes sin inconvenientes',
          detail: 'Ya tuvieron una coordinación cerrada sin incidentes y pueden retomar desde una base conocida.',
          sharedCompletedBookings: 1,
        },
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
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'host-1',
        receiver_id: 'tenant-1',
        content: 'Si te sirve, después te paso el alias para la transferencia.',
        created_at: '2026-04-06T11:07:00.000Z',
      },
    ]);

    renderChat();

    expect(await screen.findByText('Antes de transferir, verificá que el titular coincida.')).toBeInTheDocument();
  });

  test('shows a guided starter state with host context and quick questions for the first guest message', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        interactionContinuity: {
          label: 'Ya interactuaron antes sin inconvenientes',
          detail: 'Ya tuvieron una coordinación cerrada sin incidentes y pueden retomar desde una base conocida.',
          sharedCompletedBookings: 1,
        },
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

    expect((await screen.findAllByText('Consultá disponibilidad o hacé preguntas antes de decidir.')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Conversación con Mariana')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Casa de prueba') && content.includes('2 huéspedes'))).toBeInTheDocument();
    expect(screen.getByText('Estado: Esperando respuesta del anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Timeline operativo')).toBeInTheDocument();
    expect(screen.getByText('Por seguridad, mantené la conversación dentro de Alquiler Real hasta confirmar la reserva.')).toBeInTheDocument();
    expect(screen.getByText('La identidad del anfitrión ya está validada. Usá este chat para confirmar ubicación, acceso, reglas y cualquier detalle antes de avanzar.')).toBeInTheDocument();
    expect(screen.getByText('Identidad validada')).toBeInTheDocument();
    expect(screen.getByText('6 operaciones completadas')).toBeInTheDocument();
    expect(screen.getByText(/120\.000\/noche/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver propiedad' })).toBeInTheDocument();
    expect(screen.getByText('Sin mensajes')).toBeInTheDocument();
    expect(screen.getByText('Responde en ~18 min')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '¿Está disponible?' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '¿Aceptan mascotas?' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '¿Qué incluye?' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '¿Cómo es la zona?' })).toBeInTheDocument();
    expect(screen.queryByText('Ya interactuaron antes sin inconvenientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Historial de reservas')).not.toBeInTheDocument();
    expect(screen.queryByText('Reseñas de huéspedes')).not.toBeInTheDocument();
    expect(screen.getByText('Ahora le toca responder al anfitrión.')).toBeInTheDocument();
    expect(screen.queryByText('Aceptada')).not.toBeInTheDocument();
    expect(screen.queryByText('Seña confirmada')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument();
    expect(screen.queryByText('Estado actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Actúa ahora')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximo paso')).not.toBeInTheDocument();

    const composer = screen.getByPlaceholderText('Escribí tu consulta...') as HTMLInputElement;
    expect(composer.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: '¿Está disponible?' }));

    expect(composer.value).toContain('¿Está disponible');
    expect(composer.value).toContain('10 may');
    expect(composer.value).toContain('13 may');
    expect(composer.value).toContain('para 2 personas');
  });

  test('autocompletes a quick question and lets the guest edit it before sending', async () => {
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

    expect((await screen.findAllByText('Consultá disponibilidad o hacé preguntas antes de decidir.')).length).toBeGreaterThan(0);
    await screen.findByText('Conversación con Mariana');

    const composer = screen.getByPlaceholderText('Escribí tu consulta...') as HTMLInputElement;

    fireEvent.click(await screen.findByRole('button', { name: '¿Aceptan mascotas?' }));
    expect(composer.value).toBe('¿Aceptan mascotas?');

    fireEvent.change(composer, { target: { value: '¿Aceptan mascotas? Tengo una perra chica.' } });
    expect(composer.value).toBe('¿Aceptan mascotas? Tengo una perra chica.');
  });

  test('shows a soft warning when the draft includes external contact data and keeps it editable', async () => {
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
    sendMessageMock.mockResolvedValue({
      id: 'msg-risk-1',
      conversation_id: 'conv-1',
      sender_id: 'tenant-1',
      receiver_id: 'host-1',
      content: 'Escribime por WhatsApp al 11 5555 4444',
      created_at: '2026-05-01T12:00:00.000Z',
      readAt: null,
    });

    renderChat();

    const composer = await screen.findByRole('textbox') as HTMLInputElement;
    fireEvent.change(composer, { target: { value: 'Escribime por WhatsApp al 11 5555 4444' } });

    expect(screen.getByText('Parece que este mensaje incluye datos de contacto externos. Te recomendamos mantener la conversación dentro de la plataforma.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enviar mensaje/i }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('conv-1', 'Escribime por WhatsApp al 11 5555 4444', 'host-1');
    });

    expect(composer.value).toBe('');

    fireEvent.change(composer, { target: { value: '¿Está disponible?' } });
    expect(screen.queryByText('Parece que este mensaje incluye datos de contacto externos. Te recomendamos mantener la conversación dentro de la plataforma.')).not.toBeInTheDocument();
  });

  test('shows sent messages with timestamps and read state', async () => {
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
        id: 'msg-out-1',
        conversation_id: 'conv-1',
        sender_id: 'tenant-1',
        receiver_id: 'host-1',
        content: '¿Está disponible?',
        created_at: '2026-04-06T11:07:00.000Z',
        readAt: null,
      },
      {
        id: 'msg-out-2',
        conversation_id: 'conv-1',
        sender_id: 'tenant-1',
        receiver_id: 'host-1',
        content: 'Buenísimo, gracias.',
        created_at: '2026-04-06T11:09:00.000Z',
        readAt: '2026-04-06T11:10:00.000Z',
      },
    ]);

    renderChat();

    expect(await screen.findByText('¿Está disponible?')).toBeInTheDocument();
    expect(screen.getAllByText(/No leído/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Leído/).length).toBeGreaterThan(0);
  });

  test('shows compact guest context without response chip groups', async () => {
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
        guestProfile: baseGuestProfile,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByText('Estado: Reserva solicitada')).toBeInTheDocument();
    expect(screen.getByText('Timeline operativo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir conversacion sobre Casa de prueba .* Con Lucía .* Sin mensajes .* Propuesta enviada/i })).toBeInTheDocument();
    expect(screen.queryByText('Email verificado')).not.toBeInTheDocument();
    expect(screen.queryByText('Teléfono verificado')).not.toBeInTheDocument();
    expect(screen.queryByText('Perfil del huésped')).not.toBeInTheDocument();
    expect(screen.queryByText('Nivel medio (3/5)')).not.toBeInTheDocument();
    expect(screen.queryByText('Historial en la plataforma')).not.toBeInTheDocument();
    expect(screen.queryByText('Cumple lo acordado')).not.toBeInTheDocument();
    expect(screen.queryByText('Comunicación clara')).not.toBeInTheDocument();
    expect(screen.queryByText('Cierre sugerido')).not.toBeInTheDocument();
    expect(screen.queryByText('Respuestas sugeridas')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar disponibilidad' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar horario de llegada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preguntar cantidad de personas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aclarar condiciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avanzar con la seña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar reserva' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar propuesta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No avanzar con esta reserva' })).toBeInTheDocument();
  });

  test('keeps the not-advanced state visible without suggestion chips for the host', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'not_advanced',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByText('Estado: No avanzó')).toBeInTheDocument();
    expect(screen.getByText('No se pudo avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('El chat sigue abierto por si quieren recoordinar por acá.')).toBeInTheDocument();
    expect(screen.getByText('Cuando lo tengan definido, pueden dejar la reserva confirmada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ya no lo tengo disponible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Si podés mover fechas, lo vemos por este chat.' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avanzar con la seña' })).not.toBeInTheDocument();
  });

  test('shows one host advance action and moves the chat to deposit choice on send', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-1',
        bookingStatus: 'pending',
        requestMode: 'protected',
        requestStatus: 'pending',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    const closeMessage = 'Si te parece bien, podemos avanzar con la seña y dejarlo confirmado.';
    const progressedMessages = [
      {
        id: 'msg-guest-1',
        conversation_id: 'conv-1',
        sender_id: 'tenant-1',
        receiver_id: 'host-1',
        content: 'Hola, nos sirven esas fechas y seríamos dos.',
        created_at: '2026-04-06T12:00:00.000Z',
      },
      {
        id: 'msg-host-1',
        conversation_id: 'conv-1',
        sender_id: 'host-1',
        receiver_id: 'tenant-1',
        content: 'Perfecto, gracias por avisar.',
        created_at: '2026-04-06T12:03:00.000Z',
      },
    ];
    fetchMessagesMock
      .mockResolvedValueOnce(progressedMessages)
      .mockResolvedValueOnce([
        ...progressedMessages,
        {
          id: 'msg-close-1',
          conversation_id: 'conv-1',
          sender_id: 'host-1',
          receiver_id: 'tenant-1',
          content: closeMessage,
          created_at: '2026-04-06T12:05:00.000Z',
        },
      ]);
    sendMessageMock.mockResolvedValue({
      id: 'msg-close-1',
      conversation_id: 'conv-1',
      sender_id: 'host-1',
      receiver_id: 'tenant-1',
      content: closeMessage,
      created_at: '2026-04-06T12:05:00.000Z',
    });
    acceptConversationRequestMock.mockResolvedValue({
      ...baseConversation,
      booking_id: 'booking-1',
      bookingStatus: 'confirmed',
      requestMode: 'protected',
      requestStatus: 'accepted',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      requestGuests: 2,
      requestTotalPrice: 320000,
    });

    renderChat();

  expect(await screen.findByRole('button', { name: 'Avanzar con la seña' })).toBeInTheDocument();
  expect(screen.queryByText('Cierre sugerido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avanzar con la seña' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirmar reserva' })).not.toBeInTheDocument();
    expect(screen.queryByText('Respuestas sugeridas')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Avanzar con la seña' }));

    const composer = screen.getByRole('textbox');
    expect(composer).toHaveValue(closeMessage);

    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith('conv-1', closeMessage, 'tenant-1');
    });
    await waitFor(() => {
      expect(acceptConversationRequestMock).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findByText('Ya están de acuerdo.')).toBeInTheDocument();
    expect(screen.getByText(/La reserva ya quedó marcada con seña protegida\./i)).toBeInTheDocument();
    expect(screen.getByText(/Por ahora no procesamos el cobro dentro de la app\./i)).toBeInTheDocument();
    expect(screen.getByText('Estado: Seña pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Cómo sigue la seña')).not.toBeInTheDocument();
    expect(screen.queryByText('Registrada acá')).not.toBeInTheDocument();
    expect(screen.queryByText('Por fuera (más manual)')).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Cierre enviado',
      'Ya quedó acordado. La reserva quedó marcada con seña protegida y el seguimiento sigue por este chat.',
      'success',
    );
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

  test('shows the protected base state after a protected request is accepted', async () => {
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

    renderChat();

    expect(await screen.findByText('Ya están de acuerdo.')).toBeInTheDocument();
    expect(screen.getByText('Timeline operativo')).toBeInTheDocument();
    expect(screen.getByText(/La reserva ya quedó marcada con seña protegida\./i)).toBeInTheDocument();
    expect(screen.getByText(/Por ahora no procesamos el cobro dentro de la app\./i)).toBeInTheDocument();
    expect(screen.getByText('Estado: Seña pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Elegí cómo querés avanzar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pagar seña/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usar Seña Protegida/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Coordinar por chat/i })).not.toBeInTheDocument();
  });

  test('keeps a protected return action visible after the guest chooses external coordination', async () => {
    const arrivalDate = getRelativeArgentinaDate(5);
    const departureDate = getRelativeArgentinaDate(8);

    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-external-1',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositType: 'external',
        depositStatus: 'external_pending',
        requestStartDate: arrivalDate,
        requestEndDate: departureDate,
        requestGuests: 2,
        requestTotalPrice: 380000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    selectProtectedDepositMock.mockResolvedValue({
      id: 'booking-external-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositType: 'protected',
      depositStatus: null,
    });

    renderChat();

    expect(await screen.findByText('La coordinación sigue por chat y la app no interviene en pagos externos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar Seña Protegida/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Usar Seña Protegida/i }));

    await waitFor(() => {
      expect(selectProtectedDepositMock).toHaveBeenCalledWith('booking-external-1');
    });

    expect(showToastMock).toHaveBeenCalledWith(
      'Seña protegida',
      'La reserva volvió a quedar marcada con seña protegida. Cuando la seña se registre, queda retenida hasta check-in.',
      'success',
    );
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

    expect(await screen.findByText('Estado: Seña confirmada')).toBeInTheDocument();
    expect(screen.getByText('Timeline operativo')).toBeInTheDocument();
    expect(screen.getByText('La reserva ya está cerrada. Usá este chat para coordinar llegada, acceso y últimos detalles.')).toBeInTheDocument();
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

    expect(await screen.findByText('No se pudo avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('Estado: No avanzó')).toBeInTheDocument();
    expect(screen.getByText('Se venció el tiempo de respuesta. Podés seguir conversando o buscar otras opciones.')).toBeInTheDocument();
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

    expect(await screen.findByText('No se pudo avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('Estado: No avanzó')).toBeInTheDocument();
    expect(screen.getByText('La solicitud se venció. Si quieren retomarla, hace falta una nueva propuesta.')).toBeInTheDocument();
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
      depositStatus: 'manual_review',
      depositPaymentReference: 'dep-ref-chat-1',
      manualReviewReason: 'guest_checkin_without_host_access_confirmation',
      manualReviewOpenedAt: '2026-09-14T14:35:00.000Z',
    });

    renderChat();

    fireEvent.click(await screen.findByRole('button', { name: /Reportar un problema/i }));

    await waitFor(() => {
      expect(reportArrivalProblemMock).toHaveBeenCalledWith('booking-2');
    });

    expect(await screen.findAllByText('En revisión manual')).not.toHaveLength(0);
    expect(screen.getByText('Vamos a revisar la información disponible: chat, comprobante, confirmaciones y ubicación registrada.')).toBeInTheDocument();
    expect(screen.getByText('El huésped confirmó la llegada pero falta la confirmación de acceso del anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Referencia dep-ref-chat-1')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Seña en revisión',
      'El problema quedó informado y la seña pasó a revisión manual.',
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

    expect(await screen.findByText('Estado: Seña confirmada')).toBeInTheDocument();
    expect(screen.getByText('Las confirmaciones del ingreso se habilitan desde el día del check-in.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar llegada/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportar un problema/i })).not.toBeInTheDocument();
  });

  test('lets the host confirm access after the guest already confirmed the protected check-in', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(4);

    useAuthMock.mockReturnValue({ user: { id: 'host-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-access-1',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        guestCheckinConfirmed: true,
        hostAccessConfirmed: false,
        requestStartDate: arrivalDate,
        requestEndDate: departureDate,
        requestGuests: 2,
        requestTotalPrice: 430000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    confirmAccessMock.mockResolvedValue({
      id: 'booking-access-1',
      status: 'confirmed',
      depositType: 'protected',
      depositStatus: 'deposit_released',
      guestCheckinConfirmed: true,
      hostAccessConfirmed: true,
    });

    renderChat();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar acceso/i }));

    await waitFor(() => {
      expect(confirmAccessMock).toHaveBeenCalledWith('booking-access-1');
    });

    expect(await screen.findByText('Estado: Operación completada')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Acceso confirmado',
      'La seña queda lista para liberarse al anfitrión.',
      'success',
    );
  });

  test('uses the active host mode to hide guest-only protected check-in actions in unified demo conversations', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(4);

    useAuthMock.mockReturnValue({ user: { id: 'demo-user', activeMode: 'host' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        tenant_id: 'demo-user',
        host_id: 'demo-user',
        tenantName: 'Valentina Ríos',
        hostName: 'Valentina Ríos',
        booking_id: 'booking-demo-access',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        guestCheckinConfirmed: false,
        hostAccessConfirmed: false,
        requestStartDate: arrivalDate,
        requestEndDate: departureDate,
        requestGuests: 2,
        requestTotalPrice: 430000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByRole('button', { name: /Coordinar llegada/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar llegada/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportar un problema/i })).not.toBeInTheDocument();
  });

  test('lets the host mark a request as not advanced with an optional reason and keeps the chat open', async () => {
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
    fetchMessagesMock.mockResolvedValue([]);
    notAdvanceConversationRequestMock.mockResolvedValue({
      ...baseConversation,
      requestMode: 'direct',
      requestStatus: 'not_advanced',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      requestGuests: 2,
      requestTotalPrice: 320000,
    });

    renderChat();

    fireEvent.click(await screen.findByRole('button', { name: /No avanzar con esta reserva/i }));

    expect(screen.getByText((content) => content.includes('Podés dejar un motivo opcional para tu registro. El chat sigue abierto.'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'no disponible en esas fechas' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar estado/i }));

    await waitFor(() => {
      expect(notAdvanceConversationRequestMock).toHaveBeenCalledWith('conv-1', 'no disponible en esas fechas');
    });

    expect(await screen.findByText('Estado: No avanzó')).toBeInTheDocument();
    expect(screen.getByText('No se pudo avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('El chat sigue abierto por si quieren recoordinar por acá.')).toBeInTheDocument();
    expect(screen.getByText('Cuando lo tengan definido, pueden dejar la reserva confirmada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceptar propuesta/i })).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Estado actualizado',
      'Quedó marcado que no se pudo avanzar. El chat sigue abierto por si quieren recoordinar.',
      'success',
    );
  });

  test('shows the guest follow-up CTAs after a request no longer advances', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        requestMode: 'direct',
        requestStatus: 'not_advanced',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-13',
        requestGuests: 2,
        requestTotalPrice: 320000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByText('No se pudo avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('Podés seguir conversando o buscar otras opciones.')).toBeInTheDocument();
    expect(screen.getByText('Cuando lo tengan definido, pueden dejar la reserva confirmada.')).toBeInTheDocument();
    expect(screen.getByText('Estado: No avanzó')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver otras opciones/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modificar fechas/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enviar nueva propuesta/i }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('Si te parece, te mando una nueva propuesta con otras fechas.');
    });

    fireEvent.click(screen.getByRole('button', { name: /Modificar fechas/i }));

    expect(await screen.findByText('Ruta detalle propiedad')).toBeInTheDocument();
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
          content: 'El anfitrión aceptó la propuesta.',
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

    expect(screen.getByText('Estado: Operación libre')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceptar propuesta/i })).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Operación libre aceptada',
      'Ya quedó acordado. Siguen coordinando por este chat y la app no interviene en pagos externos.',
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

    expect(await screen.findByText(/Reserva confirmada/)).toBeInTheDocument();
    expect(screen.getByText('Estado: Confirmada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coordinar llegada/i })).toBeInTheDocument();
    expect(screen.queryByText('Propuesta enviada')).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Reserva confirmada',
      'La reserva ya quedó confirmada. Ahora solo falta coordinar la llegada.',
      'success',
    );
  });
});