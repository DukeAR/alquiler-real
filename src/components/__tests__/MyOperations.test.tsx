import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const apiJsonMock = vi.fn();
const fetchConversationsMock = vi.fn();
const confirmArrivalMock = vi.fn();
const confirmAccessMock = vi.fn();
const showToastMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../services/geminiService', () => ({
  fetchConversations: (...args: unknown[]) => fetchConversationsMock(...args),
  confirmArrival: (...args: unknown[]) => confirmArrivalMock(...args),
  confirmAccess: (...args: unknown[]) => confirmAccessMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

vi.mock('../ui/AccountModeSwitch', () => ({
  AccountModeSwitch: () => <div>Mode switch</div>,
}));

import { MyOperations } from '../MyOperations';

const renderOperations = () => render(
  <MemoryRouter>
    <MyOperations />
  </MemoryRouter>,
);

describe('MyOperations', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    fetchConversationsMock.mockReset();
    confirmArrivalMock.mockReset();
    confirmAccessMock.mockReset();
    showToastMock.mockReset();
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@test.com',
        role: 'tenant',
        canGuest: true,
        canHost: true,
        activeMode: 'guest',
      },
    });
  });

  test('renders guest operations with role, status, simple timeline and chat CTA', async () => {
    apiJsonMock.mockResolvedValueOnce([
      {
        id: 'booking-1',
        propertyId: 'prop-1',
        userId: 'user-1',
        conversationId: 'conv-1',
        status: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        propertyTitle: 'Casa frente al bosque',
        imageUrl: 'https://example.com/casa.jpg',
        location: 'Cariló',
        startDate: '2099-05-10',
        endDate: '2099-05-14',
      },
    ]);
    fetchConversationsMock.mockResolvedValue([
      {
        id: 'conv-1',
        property_id: 'prop-1',
        booking_id: 'booking-1',
        tenant_id: 'user-1',
        host_id: 'host-1',
        propertyTitle: 'Casa frente al bosque',
        propertyImage: 'https://example.com/casa.jpg',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        requestStartDate: '2099-05-10',
        requestEndDate: '2099-05-14',
        updated_at: '2099-05-01T10:00:00.000Z',
        created_at: '2099-05-01T09:00:00.000Z',
      },
    ]);

    renderOperations();

    expect(await screen.findByText('Mis operaciones')).toBeInTheDocument();
    expect(screen.getByText('Casa frente al bosque')).toBeInTheDocument();
    expect(screen.getByText('Cariló')).toBeInTheDocument();
    expect(screen.getByText('Huésped')).toBeInTheDocument();
    expect(screen.getByText('Seña confirmada')).toBeInTheDocument();
    expect(screen.getByText('Timeline simple')).toBeInTheDocument();
    expect(screen.getByText('Consulta iniciada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir chat' })).toBeInTheDocument();
  });

  test('shows the guest check-in CTA when the protected arrival is ready to confirm', async () => {
    apiJsonMock.mockResolvedValueOnce([
      {
        id: 'booking-2',
        propertyId: 'prop-2',
        userId: 'user-1',
        conversationId: 'conv-2',
        status: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        propertyTitle: 'Depto del mar',
        imageUrl: 'https://example.com/depto.jpg',
        location: 'Mar del Plata',
        startDate: '2000-05-10',
        endDate: '2000-05-14',
      },
    ]);
    fetchConversationsMock.mockResolvedValue([
      {
        id: 'conv-2',
        property_id: 'prop-2',
        booking_id: 'booking-2',
        tenant_id: 'user-1',
        host_id: 'host-2',
        propertyTitle: 'Depto del mar',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'held',
        requestStartDate: '2000-05-10',
        requestEndDate: '2000-05-14',
        updated_at: '2000-05-10T10:00:00.000Z',
        created_at: '2000-05-10T09:00:00.000Z',
      },
    ]);
    confirmArrivalMock.mockResolvedValue({ id: 'booking-2' });

    renderOperations();

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar check-in' }));

    await waitFor(() => {
      expect(confirmArrivalMock).toHaveBeenCalledWith('booking-2');
    });
    expect(showToastMock).toHaveBeenCalledWith(
      'Check-in confirmado',
      'Quedó registrado. Ahora esperamos la confirmación del anfitrión.',
      'success',
    );
  });

  test('renders host operations from the current mode and prioritizes manual review', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'host-1',
        name: 'Mariana',
        email: 'mariana@test.com',
        role: 'host',
        canGuest: true,
        canHost: true,
        activeMode: 'host',
      },
    });
    apiJsonMock.mockResolvedValueOnce({
      properties: [
        {
          id: 'prop-3',
          title: 'Casa del bosque',
          imageUrl: 'https://example.com/host.jpg',
          location: 'Pinamar',
        },
      ],
      recentBookings: [
        {
          id: 'booking-3',
          propertyId: 'prop-3',
          conversationId: 'conv-3',
          status: 'confirmed',
          requestMode: 'protected',
          requestStatus: 'accepted',
          depositStatus: 'manual_review',
          propertyTitle: 'Casa del bosque',
          startDate: '2099-07-01',
          endDate: '2099-07-04',
        },
      ],
    });
    fetchConversationsMock.mockResolvedValue([
      {
        id: 'conv-3',
        property_id: 'prop-3',
        booking_id: 'booking-3',
        tenant_id: 'guest-3',
        host_id: 'host-1',
        propertyTitle: 'Casa del bosque',
        bookingStatus: 'confirmed',
        requestMode: 'protected',
        requestStatus: 'accepted',
        depositStatus: 'manual_review',
        requestStartDate: '2099-07-01',
        requestEndDate: '2099-07-04',
        updated_at: '2099-06-20T10:00:00.000Z',
        created_at: '2099-06-20T09:00:00.000Z',
      },
    ]);

    renderOperations();

    expect(await screen.findByText('Anfitrión')).toBeInTheDocument();
    expect(screen.getByText('En revisión manual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver revisión' })).toBeInTheDocument();
    expect(screen.getByText('Casa del bosque')).toBeInTheDocument();
    expect(screen.getByText('Pinamar')).toBeInTheDocument();
  });
});