import { describe, expect, test } from 'vitest';
import { mapPropertyRecord } from '../propertySerializer';

describe('mapPropertyRecord', () => {
  test('builds the verification model from concrete backend fields', () => {
    const property = mapPropertyRecord({
      id: 'prop-1',
      title: 'Casa frente al mar',
      location: 'Santa Teresita',
      price: '120000',
      rating: '4.8',
      reviewsCount: '12',
      hostName: 'Laura',
      hostIdentityValidated: true,
      hostIdentityVerified: true,
      locationVerified: 1,
      materialVerified: 1,
      videoValidated: 1,
      hasPresencialVerification: 0,
      propertyCompletedBookingsCount: '0',
      propertyRealReviewsCount: '2',
      hasDigitalVerification: 1,
      isVerifiedProperty: true,
      hostCompletedReservationsCount: '6',
      hostGuestReviewsCount: '4',
      hostMemberSince: '2021-01-10T00:00:00.000Z',
      lat: '-36.7',
      lng: '-56.7',
    });

    expect(property.verificationScore).toBe(4);
    expect(property.hostTrustScore).toBe(4);
    expect(property.hostTrust).toMatchObject({
      score: 4,
      level: 'high',
    });
    expect(property.hostTrust.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'identity', status: 'complete' }),
      expect.objectContaining({ key: 'reservations', status: 'complete' }),
      expect.objectContaining({ key: 'reviews', status: 'complete' }),
      expect.objectContaining({ key: 'tenure', status: 'complete' }),
    ]));
    expect(property.verificationItems).toEqual([
      {
        key: 'identity',
        label: 'Anfitrión confirmado',
        description: 'La identidad del anfitrión ya fue confirmada dentro de la plataforma.',
        status: 'complete',
      },
      {
        key: 'location',
        label: 'Ubicación verificada',
        description: 'La zona del alojamiento ya fue verificada dentro de la plataforma.',
        status: 'complete',
      },
      {
        key: 'geolocation',
        label: 'Geolocalización precisa',
        description: 'El aviso ya cuenta con coordenadas precisas para ubicar el lugar con más claridad.',
        status: 'complete',
      },
      {
        key: 'photos',
        label: 'Fotos / video reales',
        description: 'El aviso ya muestra fotos o video reales del alojamiento.',
        status: 'complete',
      },
      {
        key: 'availability',
        label: 'Disponibilidad validada',
        description: 'Todavía falta validar la disponibilidad con calendario o reservas registradas.',
        status: 'pending',
      },
    ]);
    expect(property.verificationSummary).toEqual({
      score: 4,
      maxScore: 5,
      items: property.verificationItems,
    });
  });

  test('uses the host identity fields before legacy property flags', () => {
    const property = mapPropertyRecord({
      id: 'prop-2',
      title: 'Departamento',
      location: 'Pinamar',
      price: '98000',
      rating: '4.5',
      reviewsCount: '8',
      identityValidated: 1,
      hostIdentityValidated: 0,
      hostIdentityVerified: 0,
      locationVerified: 1,
      materialVerified: 0,
      videoValidated: 0,
      hasPresencialVerification: 0,
      propertyCompletedBookingsCount: '0',
      propertyRealReviewsCount: '0',
      hostCompletedReservationsCount: '1',
      hostGuestReviewsCount: '0',
      hostMemberSince: '2026-01-10T00:00:00.000Z',
    });

    expect(property.identityValidated).toBe(false);
    expect(property.verificationScore).toBe(1);
    expect(property.hostTrustScore).toBe(0);
    expect(property.hostTrust).toMatchObject({
      score: 0,
      level: 'low',
    });
    expect(property.verificationItems?.find((item) => item.key === 'identity')).toEqual({
      key: 'identity',
      label: 'Anfitrión confirmado',
      description: 'Todavía falta confirmar la identidad del anfitrión.',
      status: 'pending',
    });
  });

  test('normalizes optional gallery images and beds when they are available', () => {
    const property = mapPropertyRecord({
      id: 'prop-3',
      title: 'Habitacion cerca del centro',
      location: 'Santa Teresita · centro',
      price: '72000',
      rating: '4.2',
      reviewsCount: '3',
      imageUrl: 'https://example.com/cover.jpg',
      images: JSON.stringify([
        'https://example.com/cover.jpg',
        'https://example.com/room.jpg',
      ]),
      beds: '2',
    });

    expect(property.images).toEqual([
      'https://example.com/cover.jpg',
      'https://example.com/room.jpg',
    ]);
    expect(property.beds).toBe(2);
  });
});