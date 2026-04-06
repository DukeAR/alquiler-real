import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const apiJsonMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

vi.mock('../PropertyUploadForm', () => ({
  PropertyUploadForm: () => <div>PropertyUploadForm</div>,
}));

vi.mock('../ReviewModal', () => ({
  ReviewModal: () => <div>ReviewModal</div>,
}));

import { HostDashboard } from '../HostDashboard';

describe('HostDashboard', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
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

    expect(await screen.findByText('Completá lo que falta en cada aviso')).toBeInTheDocument();
    expect(screen.getByText('Cuanto más completo esté tu aviso, más arriba aparece en los resultados.')).toBeInTheDocument();
    expect(screen.getByText('4 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getByText(/Todavía falta completarla/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Disponibilidad/i }));

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

    expect(await screen.findByText('Solicitudes y huéspedes')).toBeInTheDocument();
    expect(screen.getAllByText('Marina').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Evaluar huésped' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha del huésped' }));

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Ficha del huésped')).toBeInTheDocument();
    expect(within(profileCard).getByText('Identidad confirmada')).toBeInTheDocument();
    expect(within(profileCard).getByText('Estadías completadas')).toBeInTheDocument();
    expect(within(profileCard).getByText('Conflictos')).toBeInTheDocument();
    expect(within(profileCard).getByText('Consultó antes de reservar')).toBeInTheDocument();
    expect(within(profileCard).getByText('Usuario desde 2022')).toBeInTheDocument();
    expect(within(profileCard).getByText('La coordinación fue clara y la estadía avanzó sin cambios de último momento.')).toBeInTheDocument();
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

    expect(await screen.findByText('Ficha en preparación')).toBeInTheDocument();
    expect(screen.getByText('Todavía estamos cargando sus primeros datos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha del huésped' }));

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Estamos armando esta ficha')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía se están cargando los primeros datos de esta cuenta.')).toBeInTheDocument();
    expect(within(profileCard).getByText('La validación de identidad va a aparecer acá cuando termine de cargarse la ficha.')).toBeInTheDocument();
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

    expect(await screen.findByText('Cuenta sin historial todavía')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay estadías ni reseñas para revisar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha del huésped' }));

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Cuenta sin historial todavía')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay estadías ni reseñas de anfitriones para revisar.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay reseñas de anfitriones porque esta cuenta todavía no tiene estadías visibles.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Esta solicitud todavía no dejó movimientos para revisar dentro de la plataforma.')).toBeInTheDocument();
  });
});
