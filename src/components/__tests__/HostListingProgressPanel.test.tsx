import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { HostListingProgressPanel } from '../verification/HostListingProgressPanel';

const apiJsonMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

const buildProperty = (overrides: Record<string, unknown> = {}) => ({
  id: 'prop-1',
  title: 'Casa del bosque',
  location: 'Pinamar',
  lat: -37.123456,
  lng: -56.654321,
  price: 150000,
  hostName: 'Laura',
  hostId: 'host-1',
  hostSince: '2022-01-10',
  hostExperienceYears: 4,
  historicalConsistency: 90,
  unresolvedReviewsCount: 0,
  identityValidated: true,
  locationVerified: true,
  videoValidated: false,
  traceabilityLevel: 'high',
  imageUrl: 'https://example.com/property.jpg',
  coordinates: { lat: -37.123456, lng: -56.654321 },
  description: 'Casa amplia con jardin y parrilla.',
  rating: 4.9,
  reviewsCount: 8,
  verificationItems: [
    { key: 'identity', label: 'Anfitrión confirmado', description: 'La identidad del anfitrión ya fue confirmada dentro de la plataforma.', status: 'complete' },
    { key: 'location', label: 'Ubicación verificada', description: 'La zona del alojamiento ya fue verificada dentro de la plataforma.', status: 'complete' },
    { key: 'geolocation', label: 'Geolocalización precisa', description: 'El aviso ya cuenta con coordenadas precisas para ubicar el lugar con más claridad.', status: 'complete' },
    { key: 'photos', label: 'Fotos / video reales', description: 'El aviso ya muestra fotos o video reales del alojamiento.', status: 'complete' },
    { key: 'availability', label: 'Disponibilidad no confirmada recientemente', description: 'Responder o confirmar fechas valida este punto.', status: 'pending' },
  ],
  ...overrides,
});

describe('HostListingProgressPanel', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
  });

  test('shows actionable progress and triggers inline availability action', () => {
    const onToggleAvailability = vi.fn();

    render(
      <HostListingProgressPanel
        property={buildProperty() as any}
        onToggleAvailability={onToggleAvailability}
      />,
    );

    expect(screen.getByText('Estado de tu aviso')).toBeInTheDocument();
    expect(screen.getByText('Pasos de respaldo del aviso')).toBeInTheDocument();
    expect(screen.getAllByText('Pasos de respaldo').length).toBeGreaterThan(0);
    expect(screen.getByText('Estos pasos internos ayudan a ordenar y respaldar tu publicación antes de solicitar la visita presencial.')).toBeInTheDocument();
    expect(screen.getByText('Te falta confirmar disponibilidad para aparecer entre los primeros resultados.')).toBeInTheDocument();
    expect(screen.getByText('Cómo impacta en tu publicación')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar disponibilidad' }));

    expect(onToggleAvailability).toHaveBeenCalledTimes(1);
  });

  test('saves location directly and marks it as verified', async () => {
    const onRefresh = vi.fn();
    apiJsonMock.mockResolvedValueOnce({
      id: 'prop-1',
      location: 'Pinamar norte',
      lat: -37.223344,
      lng: -56.778899,
      locationVerified: 1,
    });

    render(
      <HostListingProgressPanel
        property={buildProperty({
          location: 'Pinamar',
          lat: undefined,
          lng: undefined,
          verificationItems: [
            { key: 'identity', label: 'Anfitrión confirmado', description: 'La identidad del anfitrión ya fue confirmada dentro de la plataforma.', status: 'complete' },
            { key: 'location', label: 'Ubicación verificada', description: 'Todavía falta verificar la ubicación del alojamiento.', status: 'pending' },
            { key: 'geolocation', label: 'Geolocalización precisa', description: 'Todavía falta validar una geolocalización precisa del lugar.', status: 'pending' },
            { key: 'photos', label: 'Fotos / video reales', description: 'El aviso ya muestra fotos o video reales del alojamiento.', status: 'complete' },
            { key: 'availability', label: 'Disponibilidad validada', description: 'La disponibilidad ya muestra calendario o reservas registradas dentro de la plataforma.', status: 'complete' },
          ],
        }) as any}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Completar ubicación' }));
    fireEvent.change(screen.getByLabelText('Zona o barrio'), { target: { value: 'Pinamar norte' } });
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '-37.223344' } });
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '-56.778899' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ubicación' }));

    await waitFor(() => expect(apiJsonMock).toHaveBeenCalledWith(
      '/api/properties/prop-1',
      expect.objectContaining({ method: 'PUT' }),
    ));

    expect(JSON.parse(String(apiJsonMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      location: 'Pinamar norte',
      lat: -37.223344,
      lng: -56.778899,
      locationVerified: true,
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('uploads photos directly from the checklist action', async () => {
    const onRefresh = vi.fn();
    apiJsonMock.mockResolvedValueOnce({ success: true });

    render(
      <HostListingProgressPanel
        property={buildProperty({
          verificationItems: [
            { key: 'identity', label: 'Anfitrión confirmado', description: 'La identidad del anfitrión ya fue confirmada dentro de la plataforma.', status: 'complete' },
            { key: 'location', label: 'Ubicación verificada', description: 'La zona del alojamiento ya fue verificada dentro de la plataforma.', status: 'complete' },
            { key: 'geolocation', label: 'Geolocalización precisa', description: 'El aviso ya cuenta con coordenadas precisas para ubicar el lugar con más claridad.', status: 'complete' },
            { key: 'photos', label: 'Faltan fotos reales o video del lugar', description: 'Sumar contenido real mejora la confianza.', status: 'pending' },
            { key: 'availability', label: 'Disponibilidad validada', description: 'La disponibilidad ya muestra calendario o reservas registradas dentro de la plataforma.', status: 'complete' },
          ],
        }) as any}
        onRefresh={onRefresh}
      />,
    );

    const file = new File(['binary'], 'living-room.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Subir fotos de respaldo'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(apiJsonMock).toHaveBeenCalledWith(
      '/api/properties/prop-1/verification/assets',
      expect.objectContaining({ method: 'POST' }),
    ));

    const formData = apiJsonMock.mock.calls[0]?.[1]?.body as FormData;
    expect(formData.get('assetKind')).toBe('photo');
    expect(formData.getAll('files')).toHaveLength(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});