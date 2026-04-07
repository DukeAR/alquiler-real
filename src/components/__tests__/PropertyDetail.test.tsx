import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import FavoritesProvider from '../../contexts/FavoritesContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { showLoginModal } from '../../lib/modal';

vi.mock('../../lib/apiConfig', () => ({
  apiJson: vi.fn(),
  apiFetch: vi.fn((url: string) => {
    if (url === '/api/auth/me') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'tenant' } })
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  })
}));

import { apiJson, apiFetch } from '../../lib/apiConfig';
import {
  clearVerificationPreferenceState,
  getVerificationPreferenceState,
} from '../../lib/verificationPreference';
import PropertyDetail from '../PropertyDetail';

// Mock the modal system
vi.mock('../../lib/modal', () => ({
  showLoginModal: vi.fn()
}));

const sampleProperty = {
  id: 'p1',
  title: 'Casa de prueba',
  images: [
    'https://example.com/1.jpg',
    'https://example.com/2.jpg',
    'https://example.com/3.jpg'
  ],
  price: 120,
  rating: 4.5,
  reviewsCount: 5,
  description: 'Hermosa casa de prueba',
  location: 'Ciudad Test',
  amenities: ['Wifi rápido', 'Cocina equipada', 'Entrada autónoma'],
  maxGuests: 4,
  isVerifiedProperty: true,
  identityValidated: true,
  locationVerified: true,
  traceabilityLevel: 'high',
  hostName: 'Mariana',
  hostId: 'h1',
  hostSince: '2021-04-10',
  hostExperienceYears: 4,
  unresolvedReviewsCount: 0,
  hasDigitalVerification: true,
  videoValidated: true,
  host: {
    name: 'Mariana',
    bio: 'Responde rápido y mantiene la información al día.',
    avatarUrl: 'https://example.com/host.jpg'
  },
  hostTrustScore: 4,
  hostTrust: {
    score: 4,
    level: 'high',
    items: [
      { key: 'identity', label: 'Identidad confirmada', description: 'Identidad ya confirmada.', status: 'complete' },
      { key: 'reservations', label: 'Historial de reservas', description: '6 reservas completadas.', status: 'complete' },
      { key: 'reviews', label: 'Reseñas de huéspedes', description: '4 reseñas de huéspedes.', status: 'complete' },
      { key: 'tenure', label: 'Antigüedad en la plataforma', description: '3 años en la plataforma.', status: 'complete' },
    ],
  },
};

const ChatRoute = () => {
  const { id } = useParams();
  const location = useLocation();
  const requestContext = (location.state as { requestContext?: { mode?: string } } | null)?.requestContext;

  return (
    <div>
      <p>Chat abierto {id}</p>
      {requestContext?.mode ? <p>Modo: {requestContext.mode}</p> : null}
    </div>
  );
};

const renderPropertyDetail = () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/detail/p1"]}>
        <Routes>
          <Route path="/detail/:id" element={<FavoritesProvider><PropertyDetail /></FavoritesProvider>} />
          <Route path="/chat/:id" element={<ChatRoute />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

const waitForPropertyHeading = () => waitFor(() => expect(screen.getByRole('heading', { name: 'Casa de prueba' })).toBeDefined());

const formatIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isoPlusDays = (days: number) => {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return formatIso(next);
};

const selectDateRange = async (checkInIso: string, checkOutIso: string) => {
  fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

  await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(checkInIso) })).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: new RegExp(checkInIso) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(checkOutIso) }));
};

const advanceToConfirmationStep = async (mode: 'direct' | 'protected' = 'direct') => {
  const checkInIso = isoPlusDays(2);
  const checkOutIso = isoPlusDays(5);

  await selectDateRange(checkInIso, checkOutIso);

  fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
  await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

  fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
  await waitFor(() => expect(screen.getByText('Elegí cómo querés avanzar')).toBeDefined());

  if (mode === 'protected') {
    fireEvent.click(screen.getByLabelText(/reserva protegida/i));
    expect(screen.getByLabelText(/reserva protegida/i)).toBeChecked();
  } else {
    fireEvent.click(screen.getByLabelText(/acordar directamente/i));
    expect(screen.getByLabelText(/acordar directamente/i)).toBeChecked();
  }

  fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
  await waitFor(() => expect(screen.getByText('Revisá el resumen final')).toBeDefined());

  return { checkInIso, checkOutIso };
};

beforeEach(() => {
  clearVerificationPreferenceState();

  (apiJson as any).mockImplementation(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
    if (url === '/api/bookings') return [];
    if (url === '/api/conversations' && options?.method === 'POST') {
      return {
        id: 'conv-1',
        property_id: 'p1',
        tenant_id: 'u1',
        host_id: 'h1',
        hostName: 'Mariana',
        propertyTitle: 'Casa de prueba',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    if (url === '/api/messages' && options?.method === 'POST') {
      return {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'u1',
        receiver_id: 'h1',
        content: 'Hola',
        created_at: new Date().toISOString(),
      };
    }
    return sampleProperty;
  });

  // Mock apiFetch for AuthProvider initialization
  (apiFetch as any).mockImplementation(async (url: string) => {
    if (url === '/api/auth/me') {
      return { 
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'tenant' } })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });

  // default fetch mock: favorites provider and other calls
  global.fetch = vi.fn().mockImplementation(async (input: any, options: any = {}) => {
    const url = typeof input === 'string' ? input : input?.toString?.() || '';
    if (url.includes('/api/leads') && options.method === 'POST') {
      return { ok: true, status: 201, json: async () => ({ id: 'lead1' }) };
    }
    if (url.includes('/api/favorites')) {
      return { ok: true, status: 200, json: async () => [] };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }) as any;
});

afterEach(() => {
  clearVerificationPreferenceState();
  vi.restoreAllMocks();
});

describe('PropertyDetail', () => {
  test('renders property and switches main image when thumbnails clicked', async () => {
    renderPropertyDetail();

    // wait for title to appear
    await waitForPropertyHeading();

    const mainImg = screen.getByAltText(/imagen 1/i);
    expect(mainImg).toBeTruthy();

    const thumbButtons = screen.getAllByLabelText(/Ver imagen/i);
    expect(thumbButtons.length).toBeGreaterThanOrEqual(2);

    // click second thumbnail
    fireEvent.click(thumbButtons[1]);

    // main image should update
    await waitFor(() => expect(screen.getByAltText(/imagen 2/i)).toBeTruthy());
  });

  test('opens lightbox on main image click and closes with Escape', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();
    const mainImg = screen.getByAltText(/imagen 1/i);
    fireEvent.click(mainImg);

    // dialog should appear
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());

    // press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('shows one booking step at a time and asks to choose how to continue before advancing', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.getByText('Elegí las fechas')).toBeDefined();
    expect(screen.queryByText('Definí quiénes viajan')).toBeNull();
    expect(screen.queryByText('Acordar directamente')).toBeNull();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);
    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Elegí cómo querés avanzar')).toBeDefined());

    const nextButton = screen.getByRole('button', { name: /^siguiente$/i });

    expect(screen.getByLabelText(/acordar directamente/i)).not.toBeChecked();
    expect(screen.getByLabelText(/reserva protegida/i)).not.toBeChecked();
    expect(nextButton).toBeDisabled();
    expect(screen.getByText('Todavía no elegiste cómo avanzar')).toBeDefined();

    fireEvent.click(screen.getByLabelText(/acordar directamente/i));

    expect(screen.getByLabelText(/acordar directamente/i)).toBeChecked();
    expect(nextButton).not.toBeDisabled();
    expect(screen.queryByText('Todavía no elegiste cómo avanzar')).toBeNull();
  });

  test('keeps a persistent reservation context updated while the user advances', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const desktopContext = screen.getByRole('region', { name: /contexto de la reserva/i });
    const mobileContext = screen.getByRole('region', { name: /resumen móvil de la reserva/i });

    expect(within(desktopContext).getByText('Casa de prueba')).toBeDefined();
    expect(within(desktopContext).getByText('Todavía no elegiste fechas')).toBeDefined();
    expect(within(desktopContext).getByText('Se definen al elegir fechas')).toBeDefined();
    expect(within(desktopContext).getByText('1 huésped')).toBeDefined();
    expect(within(desktopContext).getByText('Elegí fechas para calcularlo')).toBeDefined();
    expect(within(mobileContext).getByText('Casa de prueba')).toBeDefined();
    expect(within(mobileContext).getByText('1 huésped · Total al elegir fechas')).toBeDefined();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);

    expect(within(desktopContext).getByText('3 noches')).toBeDefined();
    expect(within(desktopContext).getByText(new RegExp('360'))).toBeDefined();
    expect(within(desktopContext).queryByText('Todavía no elegiste fechas')).toBeNull();
    expect(within(mobileContext).getByText(/3 noches · 1 huésped ·/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /sumar adulto/i }));

    expect(within(desktopContext).getByText('2 huéspedes')).toBeDefined();
    expect(within(mobileContext).getByText(/3 noches · 2 huéspedes ·/i)).toBeDefined();
  });

  test('renders clearer amenities and trust sections', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.getByText('Lo importante de este aviso')).toBeDefined();
    expect(screen.getByText('Comodidades clave')).toBeDefined();
    expect(screen.getByText('Wifi rápido')).toBeDefined();
    expect(screen.getByText('Nivel de verificación')).toBeDefined();
    expect(screen.getByText('Qué parte del aviso ya fue comprobada. Lo demás conviene revisarlo antes de reservar.')).toBeDefined();
    expect(screen.getByText('Este aviso ya tiene varias comprobaciones hechas.')).toBeDefined();
    expect(screen.getByText('3 de 5 comprobaciones')).toBeDefined();
    expect(screen.getByText('✔ ✔ ✔ ○ ○')).toBeDefined();
    expect(screen.getByText('Ubicación: Ciudad Test.')).toBeDefined();
    expect(screen.getAllByText('Identidad confirmada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación verificada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Material real del lugar').length).toBeGreaterThan(0);
    expect(screen.getByText('Podés ver mejor el estado real.')).toBeDefined();
    expect(screen.getByText('Falta confirmar vínculo con el lugar.')).toBeDefined();
    expect(screen.getByText('Todavía no hay revisión en el lugar.')).toBeDefined();
    expect(screen.queryByText('Este aviso muestra más cosas comprobadas que la mayoría.')).toBeNull();
    expect(screen.getByText('Mariana')).toBeDefined();
    expect(screen.getByText('Nivel de confianza: Alto')).toBeDefined();
    expect(screen.getByText('Historial de reservas')).toBeDefined();
    expect(screen.getByText('Reseñas de huéspedes')).toBeDefined();
    expect(screen.queryByText('Antigüedad en la plataforma')).toBeNull();
  });

  test('shows the stronger guided verification message when the score reaches 4', async () => {
    (apiJson as any).mockImplementation(async (url: string) => {
      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];

      return {
        ...sampleProperty,
        propertyRelationshipVerified: true,
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.getByText('4 de 5 comprobaciones')).toBeDefined();
    expect(screen.getByText('Este aviso muestra más cosas comprobadas que la mayoría.')).toBeDefined();
    expect(screen.queryByText('Este aviso ya tiene varias comprobaciones hechas.')).toBeNull();
  });

  test('records the detail visit when the property reaches a high verification level', async () => {
    (apiJson as any).mockImplementation(async (url: string) => {
      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];

      return {
        ...sampleProperty,
        propertyRelationshipVerified: true,
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(getVerificationPreferenceState().openedHighVerificationPropertyIds).toEqual(['p1']);
    expect(getVerificationPreferenceState().caresAboutVerification).toBe(false);
  });

  test('keeps showing the verification section even when the backing is still low', async () => {
    (apiJson as any).mockImplementation(async (url: string) => {
      if (url.endsWith('/reviews')) return [];
      if (url === '/api/bookings') return [];

      return {
        ...sampleProperty,
        identityValidated: false,
        locationVerified: true,
        videoValidated: false,
        propertyRelationshipVerified: false,
        hasPresencialVerification: false,
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.getByText('Nivel de verificación')).toBeDefined();
    expect(screen.getByText('1 de 5 comprobaciones')).toBeDefined();
    expect(screen.getByText('✔ ○ ○ ○ ○')).toBeDefined();
    expect(screen.getByText('Falta confirmar quién publica.')).toBeDefined();
    expect(screen.queryByText('Este aviso muestra más cosas comprobadas que la mayoría.')).toBeNull();
    expect(screen.queryByText('Este aviso ya tiene varias comprobaciones hechas.')).toBeNull();
  });

  test('guides the booking flow and stops guest selection at capacity', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);
    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

    const addAdultButton = screen.getByRole('button', { name: /sumar adulto/i });
    const addChildButton = screen.getByRole('button', { name: /sumar menor/i });

    fireEvent.click(addAdultButton);
    fireEvent.click(addAdultButton);
    fireEvent.click(addAdultButton);

    expect(addAdultButton).toBeDisabled();
    expect(addChildButton).toBeDisabled();
    expect(screen.getByText('Máximo: 4 huéspedes.')).toBeDefined();
  });

  test('shows the final confirmation step with editable summary rows', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    await advanceToConfirmationStep('direct');

    expect(screen.getByText('Revisá el resumen final')).toBeDefined();
    expect(screen.getAllByText('Acuerdo directo').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /editar/i })).toHaveLength(3);
    expect(screen.getByRole('button', { name: /^solicitar reserva$/i })).toBeDefined();
  });

  test('smoke: sends a direct request by default and opens the contextual chat', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    await advanceToConfirmationStep('direct');

    const bookingCalls: Array<{ url: string; options: RequestInit }> = [];
    const apiJsonCalls: Array<{ url: string; options?: RequestInit }> = [];

    (apiJson as any).mockImplementation(async (url: string, options?: RequestInit) => {
      apiJsonCalls.push({ url, options });

      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];
      if (url === '/api/conversations' && options?.method === 'POST') {
        return {
          id: 'conv-1',
          property_id: 'p1',
          tenant_id: 'u1',
          host_id: 'h1',
          hostName: 'Mariana',
          propertyTitle: 'Casa de prueba',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      if (url === '/api/messages' && options?.method === 'POST') {
        return {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'u1',
          receiver_id: 'h1',
          content: 'Hola Mariana',
          created_at: new Date().toISOString(),
        };
      }

      return sampleProperty;
    });

    (apiFetch as any).mockImplementation(async (url: string, options: RequestInit = {}) => {
      if (url === '/api/auth/me') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'tenant' } })
        };
      }

      if (url === '/api/bookings' && options.method === 'POST') {
        bookingCalls.push({ url, options });
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    fireEvent.click(screen.getByRole('button', { name: /^solicitar reserva$/i }));

    expect(bookingCalls).toHaveLength(0);

    await waitFor(() => {
      expect(apiJsonCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ url: '/api/conversations' }),
          expect.objectContaining({ url: '/api/messages' }),
        ]),
      );
    });

    await waitFor(() => expect(screen.getByText('Chat abierto conv-1')).toBeDefined());
    expect(screen.getByText('Modo: direct')).toBeDefined();
  });

  test('smoke: selects date range and sends a protected request from the sidebar', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const { checkInIso, checkOutIso } = await advanceToConfirmationStep('protected');

    const bookingCalls: Array<{ url: string; options: RequestInit }> = [];
    const apiJsonCalls: Array<{ url: string; options?: RequestInit }> = [];

    (apiJson as any).mockImplementation(async (url: string, options?: RequestInit) => {
      apiJsonCalls.push({ url, options });

      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];
      if (url === '/api/conversations' && options?.method === 'POST') {
        return {
          id: 'conv-1',
          property_id: 'p1',
          booking_id: 'booking-1',
          tenant_id: 'u1',
          host_id: 'h1',
          hostName: 'Mariana',
          propertyTitle: 'Casa de prueba',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      if (url === '/api/messages' && options?.method === 'POST') {
        return {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'u1',
          receiver_id: 'h1',
          content: 'Hola Mariana',
          created_at: new Date().toISOString(),
        };
      }

      return sampleProperty;
    });

    (apiFetch as any).mockImplementation(async (url: string, options: RequestInit = {}) => {
      if (url === '/api/auth/me') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'tenant' } })
        };
      }

      if (url === '/api/bookings' && options.method === 'POST') {
        bookingCalls.push({ url, options });

        return {
          ok: true,
          status: 201,
          json: async () => ({
            booking: {
              id: 'booking-1',
              propertyId: 'p1',
              userId: 'u1',
              status: 'pending',
              startDate: checkInIso,
              endDate: checkOutIso,
              guests: 1,
              totalPrice: 360,
              stay_code: 'AR1234',
            },
            contract: { propertyTitle: 'Casa de prueba' },
            pricing: { nights: 3, nightly: 120, total: 360 },
          }),
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    fireEvent.click(screen.getByRole('button', { name: /^solicitar reserva$/i }));

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    expect(bookingCalls).toHaveLength(1);
    expect(JSON.parse(String(bookingCalls[0].options.body))).toMatchObject({
      propertyId: 'p1',
      startDate: checkInIso,
      endDate: checkOutIso,
      guests: 1,
      totalPrice: 360,
      requestMode: 'protected',
    });
    expect(apiJsonCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/api/conversations' }),
        expect.objectContaining({ url: '/api/messages' }),
      ]),
    );
    expect(
      dispatchSpy.mock.calls.some(([event]) => event instanceof CustomEvent && event.type === 'app-notification')
    ).toBe(true);

    await waitFor(() => expect(screen.getByText('Chat abierto conv-1')).toBeDefined());
    expect(screen.getByText('Modo: protected')).toBeDefined();
  });

  test('smoke: keeps the booking CTA disabled until dates are complete', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const reserveButton = screen.getByRole('button', { name: /^siguiente$/i });

    expect(reserveButton).toBeDisabled();
    expect(screen.getByText('Elegí las fechas')).toBeInTheDocument();
    expect(screen.queryByText('Acordar directamente')).toBeNull();
  });

  test('asks for login when trying to confirm a reservation without a session', async () => {
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url === '/api/auth/me') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: null })
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();
    expect(screen.queryByRole('button', { name: /guardar en guardados/i })).toBeNull();

    await advanceToConfirmationStep('protected');
    fireEvent.click(screen.getByRole('button', { name: /^solicitar reserva$/i }));

    await waitFor(() => expect(showLoginModal).toHaveBeenCalledTimes(1));
  });
});
