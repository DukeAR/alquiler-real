import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const apiJsonMock = vi.fn();
const showToastMock = vi.fn();
const navigateMock = vi.fn();
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

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'host-1',
      activeMode: 'host',
      canGuest: true,
      canHost: true,
    },
    setActiveMode: setActiveModeMock,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../PropertyUploadForm.tsx', () => ({
  PropertyUploadForm: () => <div>PropertyUploadForm</div>,
}));

vi.mock('../ReviewModal', () => ({
  ReviewModal: () => <div>ReviewModal</div>,
}));

vi.mock('../ui/AccountModeSwitch', () => ({
  AccountModeSwitch: () => <div>Mode switch</div>,
}));

import { HostDashboard } from '../HostDashboard.tsx';

describe('HostDashboard', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
    navigateMock.mockReset();
    setActiveModeMock.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  test('opens the availability panel and removes a manual block', async () => {
    apiJsonMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/host/dashboard') {
        return {
          stats: {
            host_rating: 4.9,
            total_bookings_hosted: 3,
            trust_score: 88,
            badge: 'Verificado',
            host_verified: true,
          },
          properties: [
            {
              id: 'prop-1',
              title: 'Casa del bosque',
              location: 'Pinamar',
              price: 150000,
              status: 'active',
              reviewsCount: 8,
              rating: 4.9,
              imageUrl: 'https://example.com/property.jpg',
              verificationScore: 4,
              verificationItems: [
                { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
                { key: 'location', label: 'Ubicación verificada', description: 'El lugar existe y está ubicado.', status: 'complete' },
                { key: 'visual', label: 'Material real del lugar', description: 'Podés ver mejor el estado real.', status: 'complete' },
                { key: 'relationship', label: 'Relación con la propiedad', description: 'Falta confirmar vínculo con el lugar.', status: 'pending' },
                { key: 'onsite', label: 'Verificación presencial', description: 'Ya hubo una revisión en el lugar.', status: 'complete' },
              ],
            },
          ],
          recentBookings: [],
          estimatedIncome: 250000,
        };
      }

      if (url === '/api/properties/prop-1/availability' && options?.method === 'PUT') {
        return { manualBlocks: [] };
      }

      if (url === '/api/properties/prop-1/availability') {
        return [
          { start: '2099-09-10', end: '2099-09-12', source: 'manual', status: 'blocked' },
          { start: '2099-09-15', end: '2099-09-18', source: 'booking', status: 'confirmed' },
        ];
      }

      return {};
    });

    render(<HostDashboard onBack={vi.fn()} />);

    expect(await screen.findByText('Qué conviene hacer ahora')).toBeInTheDocument();
    expect(screen.getByText('Tus publicaciones')).toBeInTheDocument();
    expect(screen.getByText('Cuanto más completo esté tu aviso, más arriba aparece en los resultados.')).toBeInTheDocument();
    expect(screen.getByText('4 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getByText(/Te falta completar 1 verificación/i)).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole('button', { name: /Disponibilidad/i }))[1]!);

    expect(await screen.findByText('Calendario de publicación')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado manualmente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Quitar/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith(
        '/api/properties/prop-1/availability',
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    expect(showToastMock).toHaveBeenCalledWith(
      'Disponibilidad actualizada',
      'Las fechas volvieron a quedar disponibles.',
      'success',
    );
  });

  test('shows the guest profile sheet for a pending booking before evaluation is enabled', async () => {
    apiJsonMock.mockResolvedValue({
      stats: {
        host_rating: 4.9,
        total_bookings_hosted: 4,
        trust_score: 88,
        badge: 'Verificado',
        host_verified: true,
      },
      properties: [
        {
          id: 'prop-1',
          title: 'Casa del bosque',
          location: 'Pinamar',
          price: 150000,
          status: 'active',
          reviewsCount: 8,
          rating: 4.9,
          imageUrl: 'https://example.com/property.jpg',
          verificationScore: 4,
          verificationItems: [
            { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
          ],
        },
      ],
      recentBookings: [
        {
          id: 'booking-1',
          status: 'pending',
          date: '12/10/2026',
          userId: 'guest-1',
          userName: 'Marina',
          propertyTitle: 'Casa del bosque',
          guestProfile: {
            identityVerified: true,
            memberSince: '2022-02-10',
            platformHistory: {
              completedStays: 4,
              conflictsCount: 1,
              cancellationsCount: 0,
            },
            hostReviews: [
              {
                id: 'review-1',
                authorName: 'Laura',
                date: '2025-11-14',
                comment: 'La coordinación fue clara y la estadía avanzó sin cambios de último momento.',
              },
            ],
            profileCompletion: {
              profileComplete: true,
              photoUploaded: true,
              basicDetailsComplete: true,
            },
            operationSignals: [
              { id: 'consulted-before', label: 'Consultó antes de reservar', active: true },
              { id: 'saved-property', label: 'Guardó la propiedad', active: true },
              { id: 'returned-to-view', label: 'Volvió a verla', active: false },
            ],
          },
        },
      ],
      contactedGuests: [
        {
          id: 'guest-1',
          name: 'Marina',
        },
      ],
      estimatedIncome: 250000,
    });

    render(<HostDashboard onBack={vi.fn()} />);

    expect(await screen.findByText('Solicitudes y reservas')).toBeInTheDocument();
    expect(screen.getAllByText('Marina').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Evaluar huésped' })).not.toBeInTheDocument();

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Antes de aceptar, podés revisar esto')).toBeInTheDocument();
    expect(within(profileCard).getByText('Datos del huésped')).toBeInTheDocument();
    expect(within(profileCard).getByText('Señales de esta operación')).toBeInTheDocument();
    expect(within(profileCard).getByText('Reseñas de anfitriones')).toBeInTheDocument();
    expect(within(profileCard).getByText('Confirmada')).toBeInTheDocument();
    expect(within(profileCard).getByText('Estadías completadas')).toBeInTheDocument();
    expect(within(profileCard).getByText('Conflictos reportados')).toBeInTheDocument();
    expect(within(profileCard).getByText('Consultó antes de reservar')).toBeInTheDocument();
    expect(within(profileCard).getByText('Completó sus datos')).toBeInTheDocument();
    expect(within(profileCard).getByText('2022')).toBeInTheDocument();
    expect(within(profileCard).getByText('La coordinación fue clara y la estadía avanzó sin cambios de último momento.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver ficha del huésped' })).not.toBeInTheDocument();

    const profileText = profileCard.textContent ?? '';
    expect(profileText.indexOf('Datos del huésped')).toBeLessThan(profileText.indexOf('Señales de esta operación'));
    expect(profileText.indexOf('Señales de esta operación')).toBeLessThan(profileText.indexOf('Reseñas de anfitriones'));
  });

  test('lets the host accept a pending request from the dashboard and open its chat', async () => {
    apiJsonMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/host/dashboard') {
        return {
          stats: {
            host_rating: 4.9,
            total_bookings_hosted: 4,
            trust_score: 88,
            badge: 'Verificado',
            host_verified: true,
          },
          properties: [
            {
              id: 'prop-1',
              title: 'Casa del bosque',
              location: 'Pinamar',
              price: 150000,
              status: 'active',
              reviewsCount: 8,
              rating: 4.9,
              imageUrl: 'https://example.com/property.jpg',
              verificationScore: 4,
              verificationItems: [
                { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
              ],
            },
          ],
          recentBookings: [
            {
              id: 'booking-accept',
              status: 'pending',
              requestMode: 'protected',
              conversationId: 'conv-accept',
              userId: 'guest-accept',
              userName: 'Marina',
              propertyTitle: 'Casa del bosque',
              startDate: '2026-10-12',
              endDate: '2026-10-16',
              guests: 2,
              totalPrice: 320000,
            },
          ],
          contactedGuests: [],
          estimatedIncome: 250000,
        };
      }

      if (url === '/api/conversations/conv-accept/accept-request' && options?.method === 'POST') {
        return {
          id: 'conv-accept',
          requestMode: 'protected',
          bookingStatus: 'confirmed',
          depositStatus: null,
        };
      }

      return {};
    });

    render(<HostDashboard onBack={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /Aceptar solicitud/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Abrir chat/i }));

    expect(navigateMock).toHaveBeenCalledWith('/chat/conv-accept');

    fireEvent.click(screen.getByRole('button', { name: /Aceptar solicitud/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith(
        '/api/conversations/conv-accept/accept-request',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findAllByText('Solicitud aceptada')).not.toHaveLength(0);
    expect(screen.getByText('Ya la aceptaste. Ahora el huésped tiene que pagar la seña desde la app.')).toBeInTheDocument();
    expect(screen.getByText('La reserva queda confirmada cuando la seña entra en custodia.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Solicitud aceptada',
      'La solicitud quedó aceptada. Ahora el huésped tiene que pagar la seña desde la app.',
      'success',
    );
  });

  test('shows explicit missing-data states when the guest profile is not structured yet', async () => {
    apiJsonMock.mockResolvedValue({
      stats: {
        host_rating: 4.9,
        total_bookings_hosted: 1,
        trust_score: 88,
        badge: 'Verificado',
        host_verified: true,
      },
      properties: [
        {
          id: 'prop-1',
          title: 'Casa del bosque',
          location: 'Pinamar',
          price: 150000,
          status: 'active',
          reviewsCount: 8,
          rating: 4.9,
          imageUrl: 'https://example.com/property.jpg',
          verificationScore: 4,
          verificationItems: [
            { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
          ],
        },
      ],
      recentBookings: [
        {
          id: 'booking-2',
          status: 'pending',
          date: '20/10/2026',
          userId: 'guest-2',
          userName: 'Tomás',
          propertyTitle: 'Casa del bosque',
        },
      ],
      contactedGuests: [
        {
          id: 'guest-2',
          name: 'Tomás',
        },
      ],
      estimatedIncome: 250000,
    });

    render(<HostDashboard onBack={vi.fn()} />);

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Estamos armando esta ficha')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía se están cargando los primeros datos de esta cuenta.')).toBeInTheDocument();
    expect(within(profileCard).getAllByText('Todavía no disponible').length).toBeGreaterThan(0);
  });

  test('shows a specific copy for a guest with an account but no visible history yet', async () => {
    apiJsonMock.mockResolvedValue({
      stats: {
        host_rating: 4.9,
        total_bookings_hosted: 2,
        trust_score: 88,
        badge: 'Verificado',
        host_verified: true,
      },
      properties: [
        {
          id: 'prop-1',
          title: 'Casa del bosque',
          location: 'Pinamar',
          price: 150000,
          status: 'active',
          reviewsCount: 8,
          rating: 4.9,
          imageUrl: 'https://example.com/property.jpg',
          verificationScore: 4,
          verificationItems: [
            { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
          ],
        },
      ],
      recentBookings: [
        {
          id: 'booking-3',
          status: 'pending',
          date: '21/10/2026',
          userId: 'guest-3',
          userName: 'Rocío',
          propertyTitle: 'Casa del bosque',
          guestProfile: {
            identityVerified: true,
            memberSince: '2026-01-12',
            platformHistory: {
              completedStays: 0,
              conflictsCount: 0,
              cancellationsCount: 0,
            },
            hostReviews: [],
            profileCompletion: {
              profileComplete: false,
              photoUploaded: true,
              basicDetailsComplete: true,
            },
            operationSignals: [],
          },
        },
      ],
      contactedGuests: [
        {
          id: 'guest-3',
          name: 'Rocío',
          guestProfile: {
            identityVerified: true,
            memberSince: '2026-01-12',
            platformHistory: {
              completedStays: 0,
              conflictsCount: 0,
              cancellationsCount: 0,
            },
            hostReviews: [],
            profileCompletion: {
              profileComplete: false,
              photoUploaded: true,
              basicDetailsComplete: true,
            },
            operationSignals: [],
          },
        },
      ],
      estimatedIncome: 250000,
    });

    render(<HostDashboard onBack={vi.fn()} />);

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Cuenta sin historial todavía')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay estadías ni reseñas de anfitriones para revisar.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay reseñas de anfitriones porque esta cuenta todavía no tiene estadías visibles.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Completó sus datos')).toBeInTheDocument();
  });

  test('lets the host mark a protected no show and keeps the deposit pending confirmation', async () => {
    const arrivalDate = getRelativeArgentinaDate(0);
    const departureDate = getRelativeArgentinaDate(4);

    apiJsonMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/host/dashboard') {
        return {
          stats: {
            host_rating: 4.9,
            total_bookings_hosted: 3,
            trust_score: 88,
            badge: 'Verificado',
            host_verified: true,
          },
          properties: [
            {
              id: 'prop-1',
              title: 'Casa del bosque',
              location: 'Pinamar',
              price: 150000,
              status: 'active',
              reviewsCount: 8,
              rating: 4.9,
              imageUrl: 'https://example.com/property.jpg',
              verificationScore: 4,
              verificationItems: [
                { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
              ],
            },
          ],
          recentBookings: [
            {
              id: 'booking-no-show',
              status: 'confirmed',
              requestMode: 'protected',
              depositStatus: 'held',
              userId: 'guest-4',
              userName: 'Sofía',
              propertyTitle: 'Casa del bosque',
              startDate: arrivalDate,
              endDate: departureDate,
              guests: 2,
              totalPrice: 540000,
            },
          ],
          estimatedIncome: 250000,
        };
      }

      if (url === '/api/bookings/booking-no-show/report-no-show' && options?.method === 'POST') {
        return {
          booking: {
            id: 'booking-no-show',
            status: 'confirmed',
            requestMode: 'protected',
            depositStatus: 'pending_confirmation',
            userId: 'guest-4',
            userName: 'Sofía',
            propertyTitle: 'Casa del bosque',
            startDate: arrivalDate,
            endDate: departureDate,
            guests: 2,
            totalPrice: 540000,
          },
        };
      }

      return {};
    });

    render(<HostDashboard onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Informar no show/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith(
        '/api/bookings/booking-no-show/report-no-show',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findAllByText('Llegada en revisión')).not.toHaveLength(0);
    expect(screen.getByText('La seña quedó en pausa mientras se revisa el no show informado.')).toBeInTheDocument();
    expect(screen.getByText('La plataforma revisa qué pasó antes de decidir cómo sigue la seña.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Llegada en revisión',
      'El no show quedó informado y la seña sigue en pausa mientras la plataforma revisa qué pasó.',
      'success',
    );
  });

  test('keeps the no show action unavailable before the check-in day', async () => {
    apiJsonMock.mockResolvedValue({
      stats: {
        host_rating: 4.9,
        total_bookings_hosted: 3,
        trust_score: 88,
        badge: 'Verificado',
        host_verified: true,
      },
      properties: [
        {
          id: 'prop-1',
          title: 'Casa del bosque',
          location: 'Pinamar',
          price: 150000,
          status: 'active',
          reviewsCount: 8,
          rating: 4.9,
          imageUrl: 'https://example.com/property.jpg',
          verificationScore: 4,
          verificationItems: [
            { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
          ],
        },
      ],
      recentBookings: [
        {
          id: 'booking-future-no-show',
          status: 'confirmed',
          requestMode: 'protected',
          depositStatus: 'held',
          userId: 'guest-8',
          userName: 'Malena',
          propertyTitle: 'Casa del bosque',
          startDate: getRelativeArgentinaDate(7),
          endDate: getRelativeArgentinaDate(10),
          guests: 2,
          totalPrice: 510000,
        },
      ],
      estimatedIncome: 250000,
    });

    render(<HostDashboard onBack={vi.fn()} />);

    expect(await screen.findAllByText('Seña en custodia')).not.toHaveLength(0);
    expect(screen.getByText('Informar no show se habilita el día del ingreso.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Informar no show/i })).not.toBeInTheDocument();
  });

  test('shows the host-specific custody message when the protected deposit is already held', async () => {
    apiJsonMock.mockResolvedValue({
      stats: {
        host_rating: 4.9,
        total_bookings_hosted: 3,
        trust_score: 88,
        badge: 'Verificado',
        host_verified: true,
      },
      properties: [
        {
          id: 'prop-1',
          title: 'Casa del bosque',
          location: 'Pinamar',
          price: 150000,
          status: 'active',
          reviewsCount: 8,
          rating: 4.9,
          imageUrl: 'https://example.com/property.jpg',
          verificationScore: 4,
          verificationItems: [
            { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
          ],
        },
      ],
      recentBookings: [
        {
          id: 'booking-held-message',
          status: 'confirmed',
          requestMode: 'protected',
          depositStatus: 'held',
          userId: 'guest-6',
          userName: 'Elena',
          propertyTitle: 'Casa del bosque',
          startDate: '2026-10-14',
          endDate: '2026-10-18',
          guests: 2,
          totalPrice: 540000,
        },
      ],
      estimatedIncome: 250000,
    });

    render(<HostDashboard onBack={vi.fn()} />);

    expect(await screen.findAllByText('Seña en custodia')).not.toHaveLength(0);
    expect(screen.getByText('La seña ya fue recibida')).toBeInTheDocument();
    expect(screen.getByText('El huésped confirmó la seña a través de la plataforma. El monto queda en custodia y se libera cuando el huésped confirma su llegada al lugar.')).toBeInTheDocument();
    expect(screen.getByText('Vas a poder ver el estado y el momento de liberación desde esta reserva.')).toBeInTheDocument();
  });

  test('lets the host cancel a protected reservation and shows the automatic refund state', async () => {
    apiJsonMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/host/dashboard') {
        return {
          stats: {
            host_rating: 4.9,
            total_bookings_hosted: 3,
            trust_score: 88,
            badge: 'Verificado',
            host_verified: true,
          },
          properties: [
            {
              id: 'prop-1',
              title: 'Casa del bosque',
              location: 'Pinamar',
              price: 150000,
              status: 'active',
              reviewsCount: 8,
              rating: 4.9,
              imageUrl: 'https://example.com/property.jpg',
              verificationScore: 4,
              verificationItems: [
                { key: 'identity', label: 'Identidad confirmada', description: 'Sabés con quién estás hablando.', status: 'complete' },
              ],
            },
          ],
          recentBookings: [
            {
              id: 'booking-host-cancel',
              status: 'confirmed',
              requestMode: 'protected',
              depositStatus: 'held',
              userId: 'guest-5',
              userName: 'Bruno',
              propertyTitle: 'Casa del bosque',
              startDate: '2026-10-04',
              endDate: '2026-10-09',
              guests: 3,
              totalPrice: 610000,
            },
          ],
          estimatedIncome: 250000,
        };
      }

      if (url === '/api/bookings/booking-host-cancel/cancel-as-host' && options?.method === 'POST') {
        return {
          booking: {
            id: 'booking-host-cancel',
            status: 'cancelled',
            requestMode: 'protected',
            depositStatus: 'refunded',
            cancellationActor: 'host',
            userId: 'guest-5',
            userName: 'Bruno',
            propertyTitle: 'Casa del bosque',
            startDate: '2026-10-04',
            endDate: '2026-10-09',
            guests: 3,
            totalPrice: 610000,
          },
        };
      }

      return {};
    });

    render(<HostDashboard onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Cancelar reserva/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith(
        '/api/bookings/booking-host-cancel/cancel-as-host',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findAllByText('Canceló el anfitrión')).not.toHaveLength(0);
    expect(screen.getByText('La reserva ya no sigue activa.')).toBeInTheDocument();
    expect(screen.getByText('Si la seña ya estaba en custodia, se devuelve.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Reserva cancelada',
      'La reserva quedó cancelada y la seña se devuelve automáticamente.',
      'success',
    );
  });
});
