import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
