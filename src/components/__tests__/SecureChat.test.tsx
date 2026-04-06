import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const useAuthMock = vi.fn();
const fetchConversationsMock = vi.fn();
const fetchMessagesMock = vi.fn();
const sendMessageMock = vi.fn();
const acceptConversationRequestMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../services/geminiService', () => ({
  fetchConversations: (...args: unknown[]) => fetchConversationsMock(...args),
  fetchMessages: (...args: unknown[]) => fetchMessagesMock(...args),
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  acceptConversationRequest: (...args: unknown[]) => acceptConversationRequestMock(...args),
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
    showToastMock.mockReset();
  });

  test('shows the accepted direct request summary without protected actions', async () => {
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

    renderChat();

    expect(await screen.findByText('Solicitud aceptada')).toBeInTheDocument();
    expect(screen.getAllByText('Casa de prueba').length).toBeGreaterThan(0);
    expect(screen.getByText('Coordiná los detalles con el anfitrión y definan cómo avanzar.')).toBeInTheDocument();
    expect(screen.getByText('Ya podés coordinar los últimos detalles con el anfitrión.')).toBeInTheDocument();
    expect(screen.getByText(/2 huéspedes/i)).toBeInTheDocument();
    expect(screen.getByText('Si vas a transferir una seña, verificá que coincida con quien publica.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continuar con reserva protegida/i })).not.toBeInTheDocument();
  });

  test('shows the protected continuation CTA after an accepted protected request', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'tenant-1' } });
    fetchConversationsMock.mockResolvedValue([
      {
        ...baseConversation,
        booking_id: 'booking-1',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        requestStartDate: '2026-05-10',
        requestEndDate: '2026-05-14',
        requestGuests: 3,
        requestTotalPrice: 540000,
      },
    ]);
    fetchMessagesMock.mockResolvedValue([]);

    renderChat();

    expect(await screen.findByText('Podés avanzar con una reserva protegida.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continuar con reserva protegida/i }));

    expect(await screen.findByText('Ruta Mis reservas')).toBeInTheDocument();
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
          content: 'Ya podés coordinar los últimos detalles con el anfitrión.',
          is_system: true,
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

    fireEvent.click(await screen.findByRole('button', { name: /Aceptar solicitud/i }));

    await waitFor(() => {
      expect(acceptConversationRequestMock).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findByText('Solicitud aceptada')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Solicitud aceptada',
      'La solicitud ya quedó aceptada y el chat pasó al cierre de detalles.',
      'success',
    );
  });
});