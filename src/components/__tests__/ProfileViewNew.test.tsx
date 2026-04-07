import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const logoutMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      name: 'Fede Test',
      email: 'fede@test.com',
      role: 'tenant',
      canGuest: true,
      canHost: false,
      activeMode: 'guest',
      interests: JSON.stringify(['🏖️ Playa y Mar', '🍲 Gastronomía']),
      bio: 'Viajo con tiempo y me gustan los lugares prolijos.',
      trustScore: 78,
      badge: 'Plata',
      rating: 4.6,
      zone: 'Santa Teresita',
      memberSince: '2024-03-01T00:00:00.000Z',
    },
    logout: logoutMock,
    refresh: refreshMock,
    updateProfile: vi.fn(async () => true),
  }),
}));

vi.mock('../ui/AccountModeSwitch', () => ({
  AccountModeSwitch: () => <div>Mode switch</div>,
}));

import { ProfileViewNew } from '../ProfileViewNew';

describe('ProfileViewNew', () => {
  beforeEach(() => {
    logoutMock.mockReset();
    refreshMock.mockReset();

    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/verification/status')) {
        return {
          ok: true,
          json: async () => ({
            level: 'VERIFICADO',
            progress: 60,
            checks: {
              dniFrontUploaded: true,
              dniBackUploaded: true,
              selfieUploaded: false,
              dniVerified: false,
            },
            missingRequirements: ['Selfie con DNI'],
          }),
        } as Response;
      }

      if (url.includes('/api/users/preferences')) {
        return {
          ok: true,
          json: async () => ({
            preferred_zone: 'Santa Teresita',
            max_price: 120000,
            preferred_property_type: 'Departamento',
          }),
        } as Response;
      }

      if (url.includes('/api/users/activity')) {
        return {
          ok: true,
          json: async () => ({
            total_bookings: 4,
            total_reviews_written: 2,
            total_reviews_received: 1,
            last_booking_date: '2026-03-18T00:00:00.000Z',
          }),
        } as Response;
      }

      if (url.includes('/api/users/reviews')) {
        return {
          ok: true,
          json: async () => ({
            written: [{ userName: 'Anfitrión Norte', rating: 5, comment: 'Todo claro.', created_at: '2026-03-20T00:00:00.000Z' }],
            received: [{ propertyTitle: 'Casa test', rating: 4, comment: 'Muy respetuoso.', created_at: '2026-03-21T00:00:00.000Z' }],
          }),
        } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    }) as typeof fetch;
  });

  test('renders the redesigned profile structure after loading', async () => {
    render(
      <MemoryRouter>
        <ProfileViewNew />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Qué muestra tu perfil')).toBeInTheDocument();
    });

    expect(screen.getByText('Resolvé lo básico')).toBeInTheDocument();
    expect(screen.getByText('Lo que ajusta lo que ves')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completá tu verificación/i })).toBeInTheDocument();
    expect(screen.getByText('🏖️ Playa y Mar')).toBeInTheDocument();
  });

  test('opens the preferences modal with the updated form layout', async () => {
    render(
      <MemoryRouter>
        <ProfileViewNew />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar preferencias/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Editar preferencias/i }));

    expect(screen.getByRole('heading', { name: 'Qué querés ver primero' })).toBeInTheDocument();
    expect(screen.getByLabelText('Zona preferida')).toBeInTheDocument();
    expect(screen.getByLabelText('Presupuesto máximo')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de propiedad')).toBeInTheDocument();
  });
});