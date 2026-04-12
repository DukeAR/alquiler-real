import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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

    expect(await screen.findByText('El anfitrión aceptó la propuesta.')).toBeInTheDocument();
    expect(screen.getByText('Ya podés informar la seña para dejarlo confirmado.')).toBeInTheDocument();
    expect(screen.getByText('Estado: Pendiente seña')).toBeInTheDocument();
    expect(screen.getByText('Antes de avanzar con la seña, confirmá que los datos coincidan con el anfitrión del aviso.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Informar seña/i }));

    await waitFor(() => {
      expect(reportDirectDepositMock).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findByText('La seña fue informada.')).toBeInTheDocument();
    expect(screen.getByText('Falta confirmar la recepcion para dejar la reserva cerrada.')).toBeInTheDocument();
    expect(screen.getByText('Guardá el comprobante de la seña por si necesitás revisarlo.')).toBeInTheDocument();
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
        content: 'Podés coordinar todo por acá. Evitá compartir datos sensibles o pagos por fuera hasta tener claro el acuerdo.',
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

    expect(await screen.findByText('Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.')).toBeInTheDocument();
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

    expect(await screen.findByText('Verificá que la cuenta esté a nombre del anfitrión antes de transferir.')).toBeInTheDocument();
  });

  test('renders a compact header with host verification, booking context, and current status', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Mariana' })).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Casa de prueba') && content.includes('2 huéspedes') && content.includes('320'))).toBeInTheDocument();
    expect(screen.getByText('Estado: Esperando respuesta')).toBeInTheDocument();
    expect(screen.getByText('Ya tuvieron una coordinación cerrada sin incidentes y pueden retomar desde una base conocida.')).toBeInTheDocument();
    expect(screen.getAllByText('Identidad confirmada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Historial de reservas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reseñas de huéspedes').length).toBeGreaterThan(0);
    expect(screen.getByText('Podés coordinar todo por acá. Evitá compartir datos sensibles o pagos por fuera hasta tener claro el acuerdo.')).toBeInTheDocument();
    expect(screen.getByText('Propuesta enviada. Falta la respuesta del anfitrión.')).toBeInTheDocument();
    expect(screen.queryByText('Propuesta enviada')).not.toBeInTheDocument();
    expect(screen.queryByText('Aceptada')).not.toBeInTheDocument();
    expect(screen.queryByText('Seña confirmada')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument();
    expect(screen.queryByText('Estado actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Actúa ahora')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximo paso')).not.toBeInTheDocument();
    expect(screen.queryByText('Mensaje sugerido')).not.toBeInTheDocument();
    expect(screen.queryByText('Preguntas rápidas')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar motivo del viaje' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar horario de llegada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preguntar qué incluye' })).not.toBeInTheDocument();

    const composer = screen.getByRole('textbox') as HTMLTextAreaElement;
    await waitFor(() => {
      expect(composer.value).toContain('Hola, ¿cómo estás? Estoy viendo el lugar');
    });
    expect(composer.value).toContain('Hola, ¿cómo estás? Estoy viendo el lugar');
    expect(composer.value).toContain('10 may');
    expect(composer.value).toContain('13 may');
    expect(composer.value).toContain('para 2 personas');
    expect(composer.value).toContain('¿Sigue disponible?');
    expect(composer.value).toContain('Me interesa avanzar si está todo bien.');
  });

  test('prefills a single first guest message without extra starter chips', async () => {
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

    await screen.findByRole('heading', { name: 'Mariana' });

    const composer = screen.getByRole('textbox') as HTMLTextAreaElement;
    await waitFor(() => {
      expect(composer.value).toContain('Hola, ¿cómo estás? Estoy viendo el lugar');
    });
    expect(composer.value).toContain('10 may');
    expect(composer.value).toContain('13 may');
    expect(composer.value).toContain('para 2 personas');
    expect(composer.value).toContain('¿Sigue disponible?');
    expect(composer.value).toContain('Me interesa avanzar si está todo bien.');
    expect(screen.queryByRole('button', { name: 'Agregar motivo del viaje' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar horario de llegada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preguntar qué incluye' })).not.toBeInTheDocument();
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

    expect(await screen.findByText('Estado: Esperando respuesta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir conversacion con Lucía .* 2 personas .* Esperando respuesta/i })).toBeInTheDocument();
    expect(screen.getAllByText('Email verificado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Teléfono verificado').length).toBeGreaterThan(0);
    expect(screen.queryByText('Perfil del huésped')).not.toBeInTheDocument();
    expect(screen.queryByText('3 de 5 comprobaciones')).not.toBeInTheDocument();
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
    expect(screen.getByText('Marcaste que no podés avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('El chat sigue abierto por si quieren recoordinar por acá.')).toBeInTheDocument();
    expect(screen.getByText('Si retoman esto y les cierra, pueden avanzar con la seña y dejarlo confirmado.')).toBeInTheDocument();
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
    const closeMessage = 'Podemos avanzar con la seña y dejarlo confirmado. Podés dejarla registrada acá o coordinarla por fuera. Si te cierra, lo podemos dejar confirmado.';
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

    expect(await screen.findByText('El siguiente paso es que el huésped defina la seña para dejarlo confirmado.')).toBeInTheDocument();
    expect(screen.getByText('La opción registrada la deja asentada. La externa sigue por chat y ambas quedan visibles.')).toBeInTheDocument();
    expect(screen.getByText('El huésped ya puede definirla')).toBeInTheDocument();
    expect(screen.getByText('La opción elegida queda visible dentro de este chat.')).toBeInTheDocument();
    expect(screen.getByText('Registrada acá')).toBeInTheDocument();
    expect(screen.getByText('Por fuera (más manual)')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Cierre enviado',
      'El chat ya quedo listo para definir la seña y dejarlo confirmado.',
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
    selectProtectedDepositMock.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositType: 'protected',
      depositStatus: null,
    });
    payProtectedDepositMock.mockResolvedValue({
      id: 'booking-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositType: 'protected',
      depositStatus: 'held',
    });

    renderChat();

    expect(await screen.findByText('Podés elegir si dejar la seña registrada acá o coordinarla por fuera.')).toBeInTheDocument();
    expect(screen.getByText('Elegí cómo dejarla')).toBeInTheDocument();
    expect(screen.getByText('La plataforma deja visible si la registran acá o si la coordinan por fuera.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dejarla registrada acá/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coordinarla por fuera/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dejarla registrada acá/i }));

    await waitFor(() => {
      expect(selectProtectedDepositMock).toHaveBeenCalledWith('booking-1');
    });

    expect(await screen.findByText('El anfitrión aceptó la solicitud.')).toBeInTheDocument();
    expect(screen.getByText(/Ya podés registrar la seña para dejarlo confirmado:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pagar seña/i }));

    await waitFor(() => {
      expect(payProtectedDepositMock).toHaveBeenCalledWith('booking-1');
    });

    expect(await screen.findByText('La seña ya quedó registrada y se libera cuando confirmás la llegada.')).toBeInTheDocument();
    expect(screen.getByText('Estado: Seña en custodia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar llegada/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coordinar llegada/i })).toBeInTheDocument();
  });

  test('lets the guest choose external coordination in one step from the deposit chooser', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-direct-choice-1',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-14',
        requestGuests: 2,
        requestTotalPrice: 410000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);
    selectExternalDepositMock.mockResolvedValue({
      id: 'booking-direct-choice-1',
      status: 'confirmed',
      requestMode: 'protected',
      depositType: 'external',
      depositStatus: 'external_pending',
    });

    renderChat();

    expect(await screen.findByText('Elegí cómo dejarla')).toBeInTheDocument();
    expect(screen.getByText('La plataforma deja visible si la registran acá o si la coordinan por fuera.')).toBeInTheDocument();
    expect(screen.getByText('Coordinarla por fuera (más manual)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Coordinarla por fuera/i }));

    await waitFor(() => {
      expect(selectExternalDepositMock).toHaveBeenCalledWith('booking-direct-choice-1');
    });

    expect(await screen.findByText('Coordinás la seña directo con el anfitrión.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Seña externa',
      'Quedó como coordinación por fuera. Si cambiás de idea antes de informarla, podés dejarla registrada desde esta conversación.',
      'success',
    );
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

    expect(await screen.findByText('Coordinás la seña directo con el anfitrión.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dejarla registrada acá/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dejarla registrada acá/i }));

    await waitFor(() => {
      expect(selectProtectedDepositMock).toHaveBeenCalledWith('booking-external-1');
    });

    expect(showToastMock).toHaveBeenCalledWith(
      'Seña en la app',
      'La seña quedó lista para registrarse acá. Vas a ver el fee antes de pagar.',
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

    expect(await screen.findByText('La seña ya quedó registrada y se libera cuando el huésped confirma la llegada.')).toBeInTheDocument();
    expect(screen.getByText('Estado: Seña en custodia')).toBeInTheDocument();
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
    expect(screen.getByText('Estado: Vencida')).toBeInTheDocument();
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
    expect(screen.getByText('Estado: Vencida')).toBeInTheDocument();
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

    expect(await screen.findByText(/La seña quedó en revisión/)).toBeInTheDocument();
    expect(screen.getByText('Estado: En revisión')).toBeInTheDocument();
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

    expect(await screen.findByText('La seña ya quedó registrada y se libera cuando confirmás la llegada.')).toBeInTheDocument();
    expect(screen.getByText('Confirmar llegada o reportar un problema se habilitan el día del ingreso.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar llegada/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reportar problema/i })).not.toBeInTheDocument();
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
    expect(screen.getByText('Marcaste que no podés avanzar con esta reserva.')).toBeInTheDocument();
    expect(screen.getByText('El chat sigue abierto por si quieren recoordinar por acá.')).toBeInTheDocument();
    expect(screen.getByText('Si retoman esto y les cierra, pueden avanzar con la seña y dejarlo confirmado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceptar propuesta/i })).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Estado actualizado',
      'Marcaste que no podés avanzar ahora. El chat sigue abierto por si quieren recoordinar.',
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
    expect(screen.getByText('El anfitrión no puede avanzar en este momento. Podés seguir conversando o buscar otras opciones.')).toBeInTheDocument();
    expect(screen.getByText('Si retoman esto y les cierra, pueden avanzar con la seña y dejarlo confirmado.')).toBeInTheDocument();
    expect(screen.getByText('Estado: No avanzó')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver otras opciones/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modificar fechas/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enviar nueva propuesta/i }));

    expect(screen.getByRole('textbox')).toHaveValue('Si te parece, te mando una nueva propuesta con otras fechas.');

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

    expect(screen.getByText('Estado: Pendiente seña')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aceptar propuesta/i })).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Propuesta aceptada',
      'La propuesta ya quedo aceptada. Ahora falta que el huesped informe la seña por chat para dejarlo confirmado.',
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
    expect(showToastMock).toHaveBeenCalledWith(
      'Reserva confirmada',
      'La reserva ya quedó confirmada. Ahora solo falta coordinar la llegada.',
      'success',
    );
  });
});