import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const apiJsonMock = vi.fn();
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

const renderDashboard = () => render(
  <MemoryRouter initialEntries={['/host-dashboard']}>
    <Routes>
      <Route path="/host-dashboard" element={<HostDashboard onBack={vi.fn()} />} />
      <Route path="/chat/:id" element={<div>Ruta chat anfitrión</div>} />
      <Route path="/detail/:id" element={<div>Ruta detalle anfitrión</div>} />
      <Route path="/verification" element={<div>Ruta verificación anfitrión</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('HostDashboard', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
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
                { key: 'identity', label: 'Anfitrión confirmado', description: 'La identidad del anfitrión ya fue confirmada dentro de la plataforma.', status: 'complete' },
                { key: 'location', label: 'Ubicación verificada', description: 'La zona del alojamiento ya fue verificada dentro de la plataforma.', status: 'complete' },
                { key: 'geolocation', label: 'Geolocalización precisa', description: 'El aviso ya cuenta con coordenadas precisas para ubicar el lugar con más claridad.', status: 'complete' },
                { key: 'photos', label: 'Fotos / video reales', description: 'El aviso ya muestra fotos o video reales del alojamiento.', status: 'complete' },
                { key: 'availability', label: 'Disponibilidad validada', description: 'Todavía falta validar la disponibilidad con calendario o reservas registradas.', status: 'pending' },
              ],
              verificationProgress: {
                level: 'medium',
                label: 'Confianza reforzada',
                summary: 'Ya sumaste identidad validada y fotos reales como base visible del aviso.',
                nextStep: 'Un video corto ayuda a generar mas confianza.',
                advancedChecks: [
                  { key: 'documents', label: 'Documentación avanzada', status: 'pending', description: 'Podés sumar documentación privada para moderación interna.' },
                  { key: 'manualReview', label: 'Revisión manual o presencial', status: 'pending', description: 'La revisión manual queda como capa avanzada.' },
                ],
              },
              premiumOnsiteOffer: {
                offerType: 'onsite-property',
                targetType: 'property',
                title: 'Comprobación presencial adicional',
                summary: 'Podés pedir una revisión presencial para sumar información validada extra en este aviso.',
                contextHint: 'Mostramos qué está comprobado para que se entienda mejor el aviso.',
                visibilityHint: 'Cuando se completa, deja una comprobación presencial visible dentro de la ficha del aviso.',
                ctaLabel: 'Activar comprobación presencial sin cargo',
                checkoutLabel: 'Activar sin cargo',
                processLabel: 'Ir a la coordinación',
                priceArs: 0,
                currency: 'ARS',
                isComplimentary: true,
                complimentaryReason: 'Disponible sin cargo para algunas propiedades durante el lanzamiento.',
                purchased: false,
                completed: false,
                redirectTo: '/verification?mode=onsite&propertyId=prop-1&returnTo=/host-dashboard',
                propertyId: 'prop-1',
                propertyTitle: 'Casa del bosque',
              },
            },
          ],
          recentBookings: [],
          estimatedIncome: 250000,
          funnelMetrics: {
            windowDays: 30,
            detailViews: 20,
            availabilityClicks: 12,
            availabilityClickRate: 60,
            chatStarts: 7,
            chatsWithFirstMessage: 5,
            firstMessageRate: 71,
            acceptedRequests: 4,
            depositsCompleted: 2,
            depositConversionRate: 50,
          },
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

    renderDashboard();

    expect(await screen.findByText('Publica, responde y mejora sin complicarte')).toBeInTheDocument();
    expect(screen.getByText('Tus publicaciones')).toBeInTheDocument();
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument();
    expect(screen.getByText('Sugerencias para mover tus avisos')).toBeInTheDocument();
    expect(screen.getByText('Primero ves si cada aviso esta activo y despues cuanto ya queda claro para quien consulta.')).toBeInTheDocument();
    expect(screen.getByText('Estado de tu aviso')).toBeInTheDocument();
    expect(screen.getByText('Verificación parcial (4/5)')).toBeInTheDocument();
    expect(screen.getAllByText('Verificación parcial').length).toBeGreaterThan(0);
    expect(screen.getByText('Te falta confirmar disponibilidad para aparecer entre los primeros resultados.')).toBeInTheDocument();
    expect(screen.getByText('Cómo impacta en tu publicación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solicitar verificación presencial/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar disponibilidad' }));

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

  test('opens the property upload flow from the dashboard when the host already has listings', async () => {
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
      recentBookings: [],
      contactedGuests: [],
      estimatedIncome: 250000,
    });

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: /Publicar propiedad/i }));

    expect(await screen.findByText('PropertyUploadForm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
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
            interactionHistory: {
              completedStays: 4,
              feedbackCount: 2,
              agreementsKeptCount: 2,
              wouldInteractAgainCount: 2,
              incidentsCount: 1,
              publicSignals: [
                { key: 'agreements', label: 'Se cumplió lo acordado', tone: 'positive' },
                { key: 'return', label: 'Volverían a interactuar', tone: 'positive' },
                { key: 'caution', label: 'Hubo una situación a considerar', tone: 'neutral' },
              ],
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
            verificationSummary: {
              score: 5,
              maxScore: 5,
              items: [
                { key: 'email', label: 'Email verificado', status: 'complete', description: 'El email principal de la cuenta ya está confirmado.' },
                { key: 'phone', label: 'Teléfono verificado', status: 'complete', description: 'El teléfono principal de la cuenta ya está confirmado.' },
                { key: 'profile', label: 'Perfil completo', status: 'complete', description: 'La cuenta ya tiene foto, presentación, zona y teléfono cargados.' },
                { key: 'history', label: 'Historial real en la plataforma', status: 'complete', description: 'La cuenta ya muestra 4 estadías completadas y 1 reseña de anfitrión dentro de la plataforma.' },
                { key: 'documentary', label: 'Identidad documental', status: 'complete', description: 'La identidad ya fue verificada.' },
              ],
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

    renderDashboard();

    expect(await screen.findByText('Actividad reciente')).toBeInTheDocument();
    expect(screen.getAllByText('Marina').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Evaluar huésped' })).not.toBeInTheDocument();

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Lo que ya podés revisar antes de aceptar')).toBeInTheDocument();
    expect(within(profileCard).getByText('Señales rápidas')).toBeInTheDocument();
    expect(within(profileCard).getByText('Comprobaciones del huésped')).toBeInTheDocument();
    expect(within(profileCard).getByText('Nivel muy alto')).toBeInTheDocument();
    expect(within(profileCard).getByText('(5/5)')).toBeInTheDocument();
    expect(within(profileCard).getByText('Mostramos qué ya está comprobado en esta cuenta y qué todavía no aparece como visible.')).toBeInTheDocument();
    expect(within(profileCard).getAllByText('Email verificado').length).toBeGreaterThan(0);
    expect(within(profileCard).getAllByText('Identidad documental').length).toBeGreaterThan(0);
    expect(within(profileCard).getByText('Historial compartido')).toBeInTheDocument();
    expect(within(profileCard).getByText('Última referencia visible')).toBeInTheDocument();
    expect(within(profileCard).getByText('Usuario desde')).toBeInTheDocument();
    expect(within(profileCard).getByText('Estadías completadas')).toBeInTheDocument();
    expect(within(profileCard).getByText('Se cumplió lo acordado')).toBeInTheDocument();
    expect(within(profileCard).getByText('2022')).toBeInTheDocument();
    expect(within(profileCard).getByText('La coordinación fue clara y la estadía avanzó sin cambios de último momento.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver ficha del huésped' })).not.toBeInTheDocument();

    const profileText = profileCard.textContent ?? '';
    expect(profileText.indexOf('Señales rápidas')).toBeLessThan(profileText.indexOf('Comprobaciones del huésped'));
    expect(profileText.indexOf('Comprobaciones del huésped')).toBeLessThan(profileText.indexOf('Historial compartido'));
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

    renderDashboard();

    expect(await screen.findByRole('button', { name: /Aceptar solicitud/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Aceptar solicitud/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith(
        '/api/conversations/conv-accept/accept-request',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findAllByText('Pendiente seña')).not.toHaveLength(0);
    expect(screen.getByText('Ya acordaron seguir. Ahora el huésped define cómo resolver la seña.')).toBeInTheDocument();
    expect(screen.getByText('La opción que elija queda visible en el chat para que el cierre sea claro.')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Solicitud aceptada',
      'La solicitud quedó aceptada. Ahora el huésped puede definir la seña desde el chat.',
      'success',
    );

    fireEvent.click(screen.getByRole('button', { name: /Abrir chat/i }));

    expect(await screen.findByText('Ruta chat anfitrión')).toBeInTheDocument();
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

    renderDashboard();

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Estamos armando esta ficha')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía se están cargando los primeros datos de esta cuenta.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay suficientes señales visibles para resumir esta cuenta.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Nivel muy bajo')).toBeInTheDocument();
    expect(within(profileCard).getByText('(0/5)')).toBeInTheDocument();
    expect(within(profileCard).getAllByText('Todavía no visible').length).toBeGreaterThan(0);
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
            verificationSummary: {
              score: 2,
              maxScore: 5,
              items: [
                { key: 'email', label: 'Email verificado', status: 'complete', description: 'El email principal de la cuenta ya está confirmado.' },
                { key: 'phone', label: 'Teléfono verificado', status: 'pending', description: 'Todavía falta confirmar el teléfono principal de la cuenta.' },
                { key: 'profile', label: 'Perfil completo', status: 'pending', description: 'Todavía faltan datos para completar el perfil.' },
                { key: 'history', label: 'Historial real en la plataforma', status: 'pending', description: 'Todavía no hay estadías completadas, reseñas de anfitriones ni actividad real visible dentro de la plataforma.' },
                { key: 'documentary', label: 'Identidad documental', status: 'complete', description: 'La identidad ya fue verificada.' },
              ],
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
            verificationSummary: {
              score: 2,
              maxScore: 5,
              items: [
                { key: 'email', label: 'Email verificado', status: 'complete', description: 'El email principal de la cuenta ya está confirmado.' },
                { key: 'phone', label: 'Teléfono verificado', status: 'pending', description: 'Todavía falta confirmar el teléfono principal de la cuenta.' },
                { key: 'profile', label: 'Perfil completo', status: 'pending', description: 'Todavía faltan datos para completar el perfil.' },
                { key: 'history', label: 'Historial real en la plataforma', status: 'pending', description: 'Todavía no hay estadías completadas, reseñas de anfitriones ni actividad real visible dentro de la plataforma.' },
                { key: 'documentary', label: 'Identidad documental', status: 'complete', description: 'La identidad ya fue verificada.' },
              ],
            },
            operationSignals: [],
          },
        },
      ],
      estimatedIncome: 250000,
    });

    renderDashboard();

    const profileCard = await screen.findByTestId('guest-request-profile-card');

    expect(within(profileCard).getByText('Cuenta sin historial todavía')).toBeInTheDocument();
    expect(within(profileCard).getByText('Comprobaciones del huésped')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay estadías ni reseñas de anfitriones para revisar.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Historial compartido')).toBeInTheDocument();
    expect(within(profileCard).getByText('Todavía no hay suficientes cierres compartidos para resumir esta cuenta.')).toBeInTheDocument();
    expect(within(profileCard).getByText('Nivel bajo')).toBeInTheDocument();
    expect(within(profileCard).getByText('(2/5)')).toBeInTheDocument();
    expect(within(profileCard).getByText('Mostramos qué ya está comprobado en esta cuenta y qué todavía no aparece como visible.')).toBeInTheDocument();
    expect(within(profileCard).getAllByText('Email verificado').length).toBeGreaterThan(0);
    expect(within(profileCard).getAllByText('Identidad documental').length).toBeGreaterThan(0);
    expect(within(profileCard).getByText('Teléfono verificado')).toBeInTheDocument();
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

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: /Reportar un problema/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith(
        '/api/bookings/booking-no-show/report-no-show',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findAllByText('Problema reportado')).not.toHaveLength(0);
    expect(screen.getByText('Quedó reportado un problema con la llegada.')).toBeInTheDocument();
    expect(screen.getByText('La plataforma está revisando qué pasó antes de decidir cómo sigue.')).toBeInTheDocument();
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

    renderDashboard();

    expect(await screen.findAllByText('Seña registrada')).not.toHaveLength(0);
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

    renderDashboard();

    expect(await screen.findAllByText('Seña registrada')).not.toHaveLength(0);
    expect(screen.getByText('La seña ya quedó registrada.')).toBeInTheDocument();
    expect(screen.getByText('Ahora pueden coordinar la llegada por el chat.')).toBeInTheDocument();
    expect(screen.getByText('Si hace falta intervención más adelante, también queda registrada desde esta reserva.')).toBeInTheDocument();
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

    renderDashboard();

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
