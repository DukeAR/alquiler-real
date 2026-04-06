import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  hostSince: '2021-04-10',
  hostExperienceYears: 4,
  unresolvedReviewsCount: 0,
  hasDigitalVerification: true,
  videoValidated: true,
  host: {
    name: 'Mariana',
    bio: 'Responde rápido y mantiene la información al día.',
    avatarUrl: 'https://example.com/host.jpg'
  }
};

const renderPropertyDetail = () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/detail/p1"]}>
        <Routes>
          <Route path="/detail/:id" element={<FavoritesProvider><PropertyDetail /></FavoritesProvider>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
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

beforeEach(() => {
  (apiJson as any).mockImplementation(async (url: string) => {
    if (url.endsWith('/reviews')) return [{ id: 'r1', reviewer_id: 'u1', rating: 5, comment: 'Buen lugar' }];
    if (url === '/api/bookings') return [];
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
  vi.restoreAllMocks();
});

describe('PropertyDetail', () => {
  test('renders property and switches main image when thumbnails clicked', async () => {
    renderPropertyDetail();

    // wait for title to appear
    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());

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

    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());
    const mainImg = screen.getByAltText(/imagen 1/i);
    fireEvent.click(mainImg);

    // dialog should appear
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());

    // press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('contact button renders', async () => {
    renderPropertyDetail();

    // Just verify property detailloads without errors
    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());
    expect(screen.getByRole('button', { name: /hablar con el anfitrión/i })).toBeDefined();
  });

  test('renders clearer amenities and trust sections', async () => {
    renderPropertyDetail();

    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());

    expect(screen.getByText('Lo importante para decidir')).toBeDefined();
    expect(screen.getByText('Comodidades clave')).toBeDefined();
    expect(screen.getByText('Wifi rápido')).toBeDefined();
    expect(screen.getByText('Nivel de verificación')).toBeDefined();
    expect(screen.getByText('3 de 5 verificaciones completadas')).toBeDefined();
    expect(screen.getByText('Ubicación: Ciudad Test.')).toBeDefined();
    expect(screen.getAllByText('Identidad confirmada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación verificada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Material real del lugar').length).toBeGreaterThan(0);
    expect(screen.getByText('Mariana')).toBeDefined();
  });

  test('guides the booking flow and stops guest selection at capacity', async () => {
    renderPropertyDetail();

    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());

    expect(screen.getByText('Elegí ingreso y salida para ver el resumen')).toBeDefined();

    const addAdultButton = screen.getByRole('button', { name: /sumar adulto/i });
    const addChildButton = screen.getByRole('button', { name: /sumar menor/i });

    fireEvent.click(addAdultButton);
    fireEvent.click(addAdultButton);
    fireEvent.click(addAdultButton);

    expect(addAdultButton).toBeDisabled();
    expect(addChildButton).toBeDisabled();
    expect(screen.getByText('Capacidad máxima alcanzada: 4 huéspedes.')).toBeDefined();
  });

  test('smoke: selects date range and confirms booking from the sidebar', async () => {
    renderPropertyDetail();

    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(checkInIso) })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(checkInIso) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(checkOutIso) }));

    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));

    await waitFor(() => expect(screen.getByText('Confirmá tu estadía', { selector: 'h3' })).toBeDefined());

    const bookingCalls: Array<{ url: string; options: RequestInit }> = [];
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
              status: 'confirmed',
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
    fireEvent.click(screen.getByRole('button', { name: /confirmar estadía/i }));

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    expect(bookingCalls).toHaveLength(1);
    expect(JSON.parse(String(bookingCalls[0].options.body))).toMatchObject({
      propertyId: 'p1',
      startDate: checkInIso,
      endDate: checkOutIso,
      guests: 1,
      totalPrice: 360,
    });
    expect(
      dispatchSpy.mock.calls.some(([event]) => event instanceof CustomEvent && event.type === 'app-notification')
    ).toBe(true);

    await waitFor(() => expect(screen.queryByText('Confirmá tu estadía', { selector: 'h3' })).toBeNull());
  });

  test('smoke: keeps the booking CTA disabled until dates are complete', async () => {
    renderPropertyDetail();

    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());

    const reserveButton = screen.getByRole('button', { name: /elegí fechas para continuar/i });

    expect(reserveButton).toBeDisabled();
    expect(screen.getByText('Elegí ingreso y salida para ver el resumen')).toBeInTheDocument();
    expect(screen.getByText('Cuando completes las fechas, vas a ver la propiedad, el anfitrión y el total antes de confirmar la estadía.')).toBeInTheDocument();

    expect(screen.queryByText('Confirmá tu estadía', { selector: 'h3' })).toBeNull();
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

    await waitFor(() => expect(screen.getByText('Casa de prueba')).toBeDefined());
    expect(screen.queryByRole('button', { name: /guardar en guardados/i })).toBeNull();

    const checkInIso = isoPlusDays(2);
    const checkOutIso = isoPlusDays(5);

    fireEvent.click(screen.getByRole('button', { name: /abrir calendario de fechas/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(checkInIso) })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(checkInIso) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(checkOutIso) }));
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));

    await waitFor(() => expect(screen.getByText('Confirmá tu estadía', { selector: 'h3' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /confirmar estadía/i }));

    await waitFor(() => expect(showLoginModal).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Confirmá tu estadía', { selector: 'h3' })).toBeNull());
  });
});
