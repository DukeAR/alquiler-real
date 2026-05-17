import { describe, expect, test } from 'vitest';
import { mapPropertyRecord } from '../propertySerializer';
import { ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS } from '../../src/lib/onsiteVerificationProtocol';

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
      hostAverageResponseTimeMinutes: '18',
      hostMemberSince: '2021-01-10T00:00:00.000Z',
      lat: '-36.7',
      lng: '-56.7',
    });

    expect(property.verificationScore).toBe(4);
    expect(property.hostTrust).toMatchObject({
      score: 4,
      level: 'high',
    });
    expect(property.verificationLevel).toBe('identity');
    expect(property.isIdentityVerified).toBe(true);
    expect(property.isPresentiallyVerified).toBe(false);
    expect(property.hostTrust.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'identity', status: 'complete' }),
      expect.objectContaining({ key: 'response', status: 'complete' }),
      expect.objectContaining({ key: 'operations', status: 'complete' }),
      expect.objectContaining({ key: 'tenure', status: 'complete' }),
    ]));
    expect(property.verificationItems).toEqual([
      {
        key: 'identity',
        label: 'Identidad del anfitrión validada en la plataforma',
        description: 'La identidad del anfitrión ya quedó validada dentro de la plataforma.',
        status: 'complete',
      },
      {
        key: 'location',
        label: 'Ubicación del aviso cargada',
        description: 'La ubicación del aviso ya quedó cargada dentro de la plataforma.',
        status: 'complete',
      },
      {
        key: 'geolocation',
        label: 'Punto exacto del aviso',
        description: 'El aviso ya cuenta con un punto de mapa para ubicar mejor la propiedad.',
        status: 'complete',
      },
      {
        key: 'photos',
        label: 'Respaldo visual del aviso',
        description: 'El aviso ya muestra fotos del lugar como respaldo visual.',
        status: 'complete',
      },
      {
        key: 'availability',
        label: 'Disponibilidad pendiente de confirmación',
        description: 'Responder o confirmar fechas actualiza este punto.',
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
    expect(property.verificationLevel).toBe('none');
    expect(property.isIdentityVerified).toBe(false);
    expect(property.isPresentiallyVerified).toBe(false);
    expect(property.verificationScore).toBe(1);
    expect(property.hostTrust).toMatchObject({
      score: 0,
      level: 'low',
    });
    expect(property.verificationItems?.find((item) => item.key === 'identity')).toEqual({
      key: 'identity',
      label: 'Identidad del anfitrión validada en la plataforma',
      description: 'Todavía falta validar la identidad del anfitrión.',
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
    expect(property.verificationLevel).toBe('none');
    expect(property.isIdentityVerified).toBe(false);
    expect(property.isPresentiallyVerified).toBe(false);
  });

  test('keeps the last onsite validation date but drops the active presencial flag when it is expired', () => {
    const expiredOnsiteDate = new Date();
    expiredOnsiteDate.setMonth(expiredOnsiteDate.getMonth() - (ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS + 1));

    const property = mapPropertyRecord({
      id: 'prop-4',
      title: 'Casa con validacion vencida',
      location: 'San Bernardo',
      price: '91000',
      hasPresencialVerification: 1,
      onsiteVerifiedAt: expiredOnsiteDate.toISOString(),
    });

    expect(property.hasPresencialVerification).toBe(false);
    expect(property.isPresentiallyVerified).toBe(false);
    expect(property.onsiteVerifiedAt).toBe(expiredOnsiteDate.toISOString());
    expect(property.onsiteVerificationMaintenanceStatus).toBe('requires_reverification');
  });

  test('surfaces reverification pending without treating it as an active presencial seal', () => {
    const property = mapPropertyRecord({
      id: 'prop-5',
      title: 'Casa con reverificacion pendiente',
      location: 'Mar de Ajo',
      price: '98000',
      hasPresencialVerification: 1,
      onsiteVerifiedAt: '2026-04-10T15:00:00.000Z',
      onsiteVerificationMaintenance: {
        status: 'reverification_pending',
        lastValidatedAt: '2026-04-10T15:00:00.000Z',
        expiresAt: '2026-10-10T15:00:00.000Z',
        triggerReason: 'detected_inconsistency',
        history: [],
      },
    });

    expect(property.hasPresencialVerification).toBe(false);
    expect(property.isPresentiallyVerified).toBe(false);
    expect(property.onsiteVerificationMaintenanceStatus).toBe('reverification_pending');
    expect(property.onsiteVerificationTriggerReason).toBe('detected_inconsistency');
  });
});