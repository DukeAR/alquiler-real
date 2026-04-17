import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

const originalIntersectionObserver = globalThis.IntersectionObserver;

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
  coordinates: { lat: -36.7, lng: -56.7 },
  amenities: ['Wifi rápido', 'Cocina equipada', 'Entrada autónoma'],
  maxGuests: 4,
  bedrooms: 3,
  bathrooms: 2,
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
  hostInteractionHistory: {
    completedReservationsCount: 6,
    feedbackCount: 4,
    agreementsKeptCount: 4,
    listingConsistentCount: 4,
    wouldInteractAgainCount: 4,
    incidentsCount: 0,
    avgResponseTimeMinutes: 18,
    publicSignals: [
      { key: 'completed-reservations', label: '6 reservas completadas', tone: 'positive', detail: 'Es el historial cerrado dentro de la plataforma.' },
      { key: 'listing-consistency', label: 'El aviso suele coincidir con lo publicado', tone: 'positive', detail: '4 cierres compartidos remarcaron consistencia con el aviso.' },
      { key: 'response-time', label: 'Responde en alrededor de 18 min', tone: 'positive' },
    ],
  },
  interactionContinuity: {
    label: 'Ya interactuaron antes sin inconvenientes',
    detail: 'Ya tuvieron una coordinación cerrada sin incidentes y pueden retomar desde una base conocida.',
    sharedCompletedBookings: 1,
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

const getDesktopBookingContext = () => screen.getByRole('region', { name: /contexto de la reserva/i });

const getStickyBookingBar = () => screen.getByRole('region', { name: /acceso rápido a disponibilidad/i });

const queryStickyBookingBar = () => screen.queryByRole('region', { name: /acceso rápido a disponibilidad/i });

const getBookingFlowDialog = () => screen.getByRole('dialog', { name: /consultar disponibilidad/i });

const DEFAULT_WINDOW_WIDTH = window.innerWidth;

const installIntersectionObserverMock = () => {
  const instances: Array<{
    callback: IntersectionObserverCallback;
    elements: Set<Element>;
    trigger: (target: Element, isIntersecting: boolean) => void;
  }> = [];

  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    elements = new Set<Element>();

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push({
        callback,
        elements: this.elements,
        trigger: (target: Element, isIntersecting: boolean) => {
          callback([
            {
              target,
              isIntersecting,
              intersectionRatio: isIntersecting ? 1 : 0,
            } as IntersectionObserverEntry,
          ], this as unknown as IntersectionObserver);
        },
      });
    }

    observe = (target: Element) => {
      this.elements.add(target);
      this.callback([
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ], this as unknown as IntersectionObserver);
    };

    disconnect = () => {};

    unobserve = (target: Element) => {
      this.elements.delete(target);
    };

    takeRecords = () => [];

    root = null;

    rootMargin = '0px';

    thresholds = [0.2];
  }

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });

  return instances;
};

const setWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });

  window.dispatchEvent(new Event('resize'));
};

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

const openBookingFlow = async () => {
  if (!screen.queryByRole('heading', { name: /consultar disponibilidad/i })) {
    fireEvent.click(screen.getAllByRole('button', { name: /consultar disponibilidad/i })[0]);
  }

  await waitFor(() => expect(getBookingFlowDialog()).toBeDefined());
};

const selectDateRange = async (checkInIso: string, checkOutIso: string) => {
  await openBookingFlow();

  if (!screen.queryByRole('dialog', { name: /selector de rango de fechas/i })) {
    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));
  }

  await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(checkInIso) })).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: new RegExp(checkInIso) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(checkOutIso) }));
};

const advanceToConfirmationStep = async () => {
  const checkInIso = isoPlusDays(2);
  const checkOutIso = isoPlusDays(5);

  await selectDateRange(checkInIso, checkOutIso);

  fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
  await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

  fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
  await waitFor(() => expect(screen.getByText('Revisá antes de enviarla')).toBeDefined());

  return { checkInIso, checkOutIso };
};

beforeEach(() => {
  clearVerificationPreferenceState();
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: undefined,
  });

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
  setWindowWidth(DEFAULT_WINDOW_WIDTH);
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: originalIntersectionObserver,
  });
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

  test('keeps the hero in the narrow mobile-safe layout', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const heading = screen.getByRole('heading', { name: 'Casa de prueba' });
    const heroImage = screen.getByAltText(/imagen 1/i);

    expect(heading.className).toContain('text-balance');
    expect(heading.className).toContain('max-w-full');
    expect(heroImage.parentElement?.className).toContain('min-h-[26rem]');
    expect(heroImage.parentElement?.className).toContain('aspect-[9/10]');
  });

  test('uses singular photo copy when the property only has one image', async () => {
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

      return {
        ...sampleProperty,
        images: ['https://example.com/1.jpg'],
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.queryByText('1 / 1 fotos')).toBeNull();
    expect(screen.getByRole('button', { name: /ver foto/i })).toBeDefined();
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

  test('shows one booking step at a time and goes from guests straight to confirmation', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.queryByText('Elegí las fechas')).toBeNull();
    expect(screen.queryByText('Definí quiénes viajan')).toBeNull();
    expect(screen.queryByText('Se define después')).toBeNull();

    await openBookingFlow();

    expect(screen.getByText('Elegí las fechas')).toBeDefined();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);
    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Revisá antes de enviarla')).toBeDefined());
    expect(screen.getByText('Se define después')).toBeDefined();
  });

  test('uses a dominant availability CTA to open the calendar directly', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const desktopContext = getDesktopBookingContext();

    expect(within(desktopContext).getByRole('button', { name: /consultar disponibilidad/i })).toBeDefined();
    expect(within(desktopContext).getByText(/120/)).toBeDefined();
    expect(within(desktopContext).getByText('/ noche')).toBeDefined();
    expect(within(desktopContext).queryByText('No estás reservando todavía')).toBeNull();

    fireEvent.click(within(desktopContext).getByRole('button', { name: /consultar disponibilidad/i }));

    await waitFor(() => expect(getBookingFlowDialog()).toBeDefined());
    await waitFor(() => expect(screen.getByRole('dialog', { name: /selector de rango de fechas/i })).toBeDefined());
  });

  test('keeps a persistent reservation context updated while the user advances', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const desktopContext = getDesktopBookingContext();

    expect(within(desktopContext).getByRole('button', { name: /consultar disponibilidad/i })).toBeDefined();
    expect(within(desktopContext).getByText('/ noche')).toBeDefined();
    expect(queryStickyBookingBar()).toBeNull();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);

    const bookingFlow = getBookingFlowDialog();

    expect(within(bookingFlow).getByText('Consultar disponibilidad')).toBeDefined();
    expect(within(bookingFlow).getByText(/3 noches · 1 huésped ·/i)).toBeDefined();
    expect(within(bookingFlow).getAllByText(new RegExp('360')).length).toBeGreaterThan(0);
    expect(within(desktopContext).getByText(/\d{1,2} \w{3} al \d{1,2} \w{3}/i)).toBeDefined();
    expect(within(desktopContext).getAllByText('1 huésped').length).toBeGreaterThan(0);
    expect(within(desktopContext).getAllByText(new RegExp('360')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /sumar adulto/i }));

    expect(within(bookingFlow).getAllByText('2 huéspedes').length).toBeGreaterThan(0);
    expect(within(desktopContext).getAllByText('2 huéspedes').length).toBeGreaterThan(0);
  });

  test('uses one sticky mobile CTA through the guided booking flow', async () => {
    setWindowWidth(390);

    renderPropertyDetail();

    await waitForPropertyHeading();

    await waitFor(() => expect(getStickyBookingBar()).toBeDefined());

    const mobileContext = getStickyBookingBar();

    expect(within(mobileContext).getByRole('button', { name: /consultar disponibilidad/i })).toBeDefined();
    expect(within(mobileContext).getByText(/120/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /^siguiente$/i })).toBeNull();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    fireEvent.click(within(mobileContext).getByRole('button', { name: /consultar disponibilidad/i }));
    await selectDateRange(checkInIso, checkOutIso);

    const bookingFlow = getBookingFlowDialog();

    expect(within(bookingFlow).getByRole('button', { name: /seguir con huéspedes/i })).toBeDefined();

    fireEvent.click(within(bookingFlow).getByRole('button', { name: /seguir con huéspedes/i }));
    await waitFor(() => expect(screen.getByText('Definí quiénes viajan')).toBeDefined());

    expect(within(bookingFlow).getByRole('button', { name: /seguir al resumen/i })).toBeDefined();

    fireEvent.click(within(bookingFlow).getByRole('button', { name: /seguir al resumen/i }));
    await waitFor(() => expect(screen.getByText('Revisá antes de enviarla')).toBeDefined());
    expect(within(bookingFlow).getByRole('button', { name: /enviar solicitud/i })).toBeDefined();
  });

  test('shows and hides the sticky CTA on desktop based on the main CTA visibility', async () => {
    const observerInstances = installIntersectionObserverMock();

    renderPropertyDetail();

    await waitForPropertyHeading();

    const desktopContext = getDesktopBookingContext();
    const primaryCta = within(desktopContext).getByRole('button', { name: /consultar disponibilidad/i });
    const stickyObserver = observerInstances.find((instance) => instance.elements.has(primaryCta));

    expect(queryStickyBookingBar()).toBeNull();
    expect(stickyObserver).toBeDefined();

    await act(async () => {
      stickyObserver?.trigger(primaryCta, false);
    });

    await waitFor(() => expect(getStickyBookingBar()).toBeDefined());
    expect(within(getStickyBookingBar()).getByText(/120/)).toBeDefined();
    expect(within(getStickyBookingBar()).getByRole('button', { name: /consultar disponibilidad/i })).toBeDefined();

    await act(async () => {
      stickyObserver?.trigger(primaryCta, true);
    });

    await waitFor(() => expect(queryStickyBookingBar()).toBeNull());
  });

  test('preserves the current booking selection when the modal closes and reopens', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);

    fireEvent.click(screen.getByRole('button', { name: /cerrar flujo de reserva/i }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /consultar disponibilidad/i })).toBeNull());
    expect(within(getDesktopBookingContext()).getByText(/\d{1,2} \w{3} al \d{1,2} \w{3}/i)).toBeDefined();
    expect(within(getDesktopBookingContext()).getAllByText(new RegExp('360')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /consultar disponibilidad/i })[0]);

    const bookingFlow = await screen.findByRole('dialog', { name: /consultar disponibilidad/i });
    expect(within(bookingFlow).getAllByText(/3 noches · 1 huésped ·/i).length).toBeGreaterThan(0);
  });

  test('renders a lean essentials card with compact verification and decision signals', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.queryByText('Lo primero para decidir')).toBeNull();
    expect(screen.getByText('Lo esencial del lugar')).toBeDefined();
    expect(screen.getByText('Lo básico para decidir si querés elegir fechas o seguir con la consulta.')).toBeDefined();
    expect(screen.queryByText('Comodidades ya detalladas')).toBeNull();
    const verificationPreview = screen.getByTestId('property-verification-preview');
    expect(within(verificationPreview).queryByText('Lo ya verificado')).toBeNull();
    expect(within(verificationPreview).getByText('Verificación parcial')).toBeDefined();
    expect(within(verificationPreview).getByText('(4/5)')).toBeDefined();
    expect(within(verificationPreview).queryByText('Este aviso tiene información confirmada, pero hay puntos pendientes.')).toBeNull();
    expect(within(verificationPreview).getByText('Listo para coordinar')).toBeDefined();
    expect(within(verificationPreview).getAllByRole('listitem')).toHaveLength(3);
    expect(within(verificationPreview).getByText('Anfitrión confirmado')).toBeDefined();
    expect(within(verificationPreview).getByText('Ubicación verificada')).toBeDefined();
    expect(within(verificationPreview).getByText('Fotos / video reales')).toBeDefined();
    expect(within(verificationPreview).queryByText('Comprobaciones visibles')).toBeNull();
    expect(screen.getByText('Cómo se valida este aviso')).toBeDefined();
    expect(screen.getByText('Más comprobaciones, menos dudas al decidir')).toBeDefined();
    expect(screen.getByText('Los avisos más completos aparecen primero.')).toBeDefined();
    expect(screen.getByText('Puede alojar hasta 4 huéspedes.')).toBeDefined();
    expect(screen.getByText('Tiene 3 dormitorios · 2 baños.')).toBeDefined();
    expect(screen.getByText('Comodidades clave: Wifi rápido · Cocina equipada · Entrada autónoma.')).toBeDefined();
    expect(screen.queryByText('Estas 5 comprobaciones muestran qué parte del aviso ya está validada y qué falta completar.')).toBeNull();
    expect(screen.queryByText('Acá ves reservas cerradas, consistencia del aviso y tiempos de respuesta.')).toBeNull();
    expect(screen.queryByText('Ya interactuaron antes sin inconvenientes')).toBeNull();
    expect(screen.queryByText('Lectura del aviso')).toBeNull();
  });

  test('shows positive coordination microcopy through the guided booking flow', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    await selectDateRange(checkInIso, checkOutIso);

    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Ajustá cuántas personas viajan.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^siguiente$/i }));
    await waitFor(() => expect(screen.getByText('Revisá el resumen y mandá la solicitud. La seña recién se define si el anfitrión acepta.')).toBeDefined());
  });

  test('keeps the verification preview compact when the listing has many checks complete', async () => {
    (apiJson as any).mockImplementation(async (url: string) => {
      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];

      return {
        ...sampleProperty,
        propertyType: 'house',
        materialVerified: true,
        availabilityValidated: true,
        hasPresencialVerification: true,
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    const verificationPreview = screen.getByTestId('property-verification-preview');
    expect(within(verificationPreview).getByText('Verificado presencialmente')).toBeDefined();
    expect(within(verificationPreview).getByText('(5/5)')).toBeDefined();
    expect(within(verificationPreview).queryByText('Este aviso fue validado con verificación presencial y cumple con todas las comprobaciones.')).toBeNull();
    expect(within(verificationPreview).getByText('Listo para coordinar')).toBeDefined();
    expect(within(verificationPreview).getAllByRole('listitem')).toHaveLength(3);
    expect(within(verificationPreview).getByText('Anfitrión confirmado')).toBeDefined();
    expect(within(verificationPreview).getByText('Ubicación verificada')).toBeDefined();
    expect(within(verificationPreview).getByText('Disponibilidad validada')).toBeDefined();
    expect(screen.queryByText('Mostramos solo comprobaciones visibles que ayudan a decidir rápido y explican qué falta validar.')).toBeNull();
  });

  test('uses a neutral action-oriented message for medium trust when key media and availability checks are already present', async () => {
    (apiJson as any).mockImplementation(async (url: string) => {
      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];

      return {
        ...sampleProperty,
        identityValidated: true,
        locationVerified: false,
        materialVerified: true,
        availabilityValidated: true,
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    const verificationPreview = screen.getByTestId('property-verification-preview');
    expect(within(verificationPreview).getByText('Verificación parcial')).toBeDefined();
    expect(within(verificationPreview).queryByText('Este aviso tiene información confirmada, pero hay puntos pendientes.')).toBeNull();
    expect(within(verificationPreview).queryByText('Listo para coordinar')).toBeNull();
  });

  test('records the detail visit when the property reaches a high verification level', async () => {
    (apiJson as any).mockImplementation(async (url: string) => {
      if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
      if (url === '/api/bookings') return [];

      return {
        ...sampleProperty,
        propertyType: 'house',
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
        hasPresencialVerification: false,
      };
    });

    renderPropertyDetail();

    await waitForPropertyHeading();

    const verificationPreview = screen.getByTestId('property-verification-preview');
    expect(within(verificationPreview).getByText('Verificación parcial')).toBeDefined();
    expect(within(verificationPreview).getByText('(2/5)')).toBeDefined();
    expect(within(verificationPreview).queryByText('Este aviso tiene información confirmada, pero hay puntos pendientes.')).toBeNull();
    expect(within(verificationPreview).getAllByRole('listitem')).toHaveLength(2);
    expect(within(verificationPreview).getByText('Ubicación verificada')).toBeDefined();
    expect(within(verificationPreview).getByText('Geolocalización precisa')).toBeDefined();
    expect(within(verificationPreview).queryByText('Listo para coordinar')).toBeNull();
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

    await advanceToConfirmationStep();

    expect(screen.getByText(/Revisá antes de enviarla/i)).toBeDefined();
    expect(screen.getAllByText(/Se define después/i).length).toBeGreaterThan(0);
    // Accept 1 or 2 edit buttons depending on UI
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    expect(editButtons.length === 1 || editButtons.length === 2).toBe(true);
    expect(screen.getByRole('button', { name: /^enviar solicitud$/i })).toBeDefined();
  });

  test('smoke: sends a neutral request and opens the contextual chat', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const { checkInIso, checkOutIso } = await advanceToConfirmationStep();

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
              requestMode: 'protected',
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

    fireEvent.click(screen.getByRole('button', { name: /^enviar solicitud$/i }));

    await waitFor(() => expect(bookingCalls).toHaveLength(1));

    await waitFor(() => {
      expect(apiJsonCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ url: '/api/conversations' }),
        ]),
      );
    });
    expect(apiJsonCalls.some((call) => call.url === '/api/messages')).toBe(false);

    await waitFor(() => expect(screen.getByText('Chat abierto conv-1')).toBeDefined());
    expect(screen.getByText('Modo: protected')).toBeDefined();
  });

  test('smoke: sends the booking request without forcing a mode in the payload', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    const { checkInIso, checkOutIso } = await advanceToConfirmationStep();

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
    fireEvent.click(screen.getByRole('button', { name: /^enviar solicitud$/i }));

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    expect(bookingCalls).toHaveLength(1);
    const bookingPayload = JSON.parse(String(bookingCalls[0].options.body));
    expect(bookingPayload).toMatchObject({
      propertyId: 'p1',
      startDate: checkInIso,
      endDate: checkOutIso,
      guests: 1,
      totalPrice: 360,
    });
    expect(bookingPayload).not.toHaveProperty('requestMode');
    expect(apiJsonCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/api/conversations' }),
      ]),
    );
    expect(apiJsonCalls.some((call) => call.url === '/api/messages')).toBe(false);
    expect(
      dispatchSpy.mock.calls.some(([event]) => event instanceof CustomEvent && event.type === 'app-notification')
    ).toBe(true);

    await waitFor(() => expect(screen.getByText('Chat abierto conv-1')).toBeDefined());
    expect(screen.getByText('Modo: protected')).toBeDefined();
  });

  test('smoke: keeps the booking CTA disabled until dates are complete', async () => {
    renderPropertyDetail();

    await waitForPropertyHeading();

    expect(screen.queryByRole('button', { name: /^siguiente$/i })).toBeNull();
    expect(screen.queryByText('Elegí las fechas')).toBeNull();

    await openBookingFlow();

    const reserveButton = screen.getByRole('button', { name: /^siguiente$/i });

    expect(reserveButton).toBeDisabled();
    expect(screen.getByText('Elegí las fechas')).toBeInTheDocument();
    expect(screen.queryByText('Acuerdo directo')).toBeNull();
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

    await advanceToConfirmationStep();
    fireEvent.click(screen.getByRole('button', { name: /^enviar solicitud$/i }));

    await waitFor(() => expect(showLoginModal).toHaveBeenCalledTimes(1));
  });
});
