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
      videoValidated: 1,
      hasPresencialVerification: 0,
      hasDigitalVerification: 1,
      isVerifiedProperty: true,
      hostCompletedReservationsCount: '6',
      hostGuestReviewsCount: '4',
      hostMemberSince: '2021-01-10T00:00:00.000Z',
      lat: '-36.7',
      lng: '-56.7',
    });

    expect(property.verificationScore).toBe(3);
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
        label: 'Identidad confirmada',
        description: 'Sabés con quién estás hablando.',
        status: 'complete',
      },
      {
        key: 'location',
        label: 'Ubicación verificada',
        description: 'El lugar existe y está ubicado.',
        status: 'complete',
      },
      {
        key: 'visual',
        label: 'Material real del lugar',
        description: 'Podés ver mejor el estado real.',
        status: 'complete',
      },
      {
        key: 'relationship',
        label: 'Relación con la propiedad',
        description: 'Falta confirmar vínculo con el lugar.',
        status: 'pending',
      },
      {
        key: 'onsite',
        label: 'Verificación presencial',
        description: 'Todavía no hay revisión en el lugar.',
        status: 'pending',
      },
    ]);
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
      videoValidated: 0,
      hasPresencialVerification: 0,
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
    expect(property.verificationItems?.[0]).toEqual({
      key: 'identity',
      label: 'Identidad confirmada',
      description: 'Falta confirmar quién publica.',
      status: 'pending',
    });
  });
});