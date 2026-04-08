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
            level: 'NIVEL_1',
            levelLabel: 'Base de contacto lista',
            verificationScore: 34,
            progress: 40,
            headline: 'Ya resolviste la base mínima de contacto.',
            summary: 'Mostramos qué está comprobado para que otros puedan decidir mejor con tu cuenta.',
            nextStep: 'Completá tu perfil y empezá a sumar actividad.',
            optionalUpgrade: 'La documentación queda como refuerzo opcional para más adelante.',
            premiumDocumentaryOffer: {
              offerType: 'documentary-user',
              targetType: 'user',
              title: 'Comprobación documental adicional',
              summary: 'Podés sumar DNI y selfie como información validada extra sobre tu cuenta.',
              contextHint: 'Mostramos qué está comprobado para que otros puedan decidir mejor.',
              visibilityHint: 'Suma una comprobación documental visible junto al resto de la información validada de tu cuenta.',
              ctaLabel: 'Activar comprobación sin cargo',
              checkoutLabel: 'Activar sin cargo',
              processLabel: 'Ir a la comprobación',
              priceArs: 0,
              currency: 'ARS',
              isComplimentary: true,
              complimentaryReason: 'Disponible sin cargo para los primeros usuarios durante el lanzamiento.',
              purchased: false,
              completed: false,
              redirectTo: '/verification?mode=documentary&returnTo=/profile',
            },
            checks: {
              emailVerified: false,
              phoneVerified: false,
              profileComplete: true,
              platformActivity: false,
              historyVerified: false,
              reviewsVerified: false,
              documentarySubmitted: false,
              documentaryVerified: false,
            },
            missingRequirements: ['Confirmar email', 'Agregar teléfono', 'Empezar a sumar actividad'],
            categories: [
              {
                id: 'contact',
                label: 'Contacto',
                score: 15,
                maxScore: 25,
                summary: 'Confirmar email y teléfono deja lista la base mínima de contacto.',
                checks: [],
              },
            ],
            benefits: {
              current: ['Ya completaste una parte del perfil base.'],
              next: ['Confirmá contacto para habilitar la base de reservas más exigentes.'],
            },
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
      expect(screen.getByText('Qué está comprobado en tu cuenta')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirmar email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agregar teléfono/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Activar comprobación sin cargo/i }).length).toBeGreaterThan(0);
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