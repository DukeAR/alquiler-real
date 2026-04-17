import { describe, expect, test } from 'vitest';
import {
  getPropertyVerificationDetails,
  getPropertyVerificationBadge,
  getPropertyVerificationGuidanceLabel,
  getPropertyVerificationGuidanceMessage,
  getPropertyVerificationItems,
  getPropertyVerificationScore,
  sortPropertiesByCatalogOrder,
  withPropertyVerificationScore,
} from '../propertyVerification';

describe('propertyVerification', () => {
  test('derives a frontend verification score when the API does not send one', () => {
    const property = withPropertyVerificationScore({
      id: 'p1',
      title: 'Casa luminosa en Pinamar',
      description: 'Tiene patio, parrilla y espacio para trabajar.',
      location: 'Pinamar norte',
      propertyType: 'Casa',
      price: 120000,
      maxGuests: 5,
      imageUrl: 'https://example.com/cover.jpg',
      images: ['https://example.com/cover.jpg'],
      lat: -37.107,
      lng: -56.861,
      identityValidated: true,
      locationVerified: true,
      verificationPhotoCount: 3,
      videoValidated: false,
    });

    expect(property.verificationScore).toBe(4);
    expect(getPropertyVerificationScore(property)).toBe(4);
    expect(getPropertyVerificationItems(property).map((item) => item.label)).toEqual([
      'Anfitrión confirmado',
      'Ubicación verificada',
      'Geolocalización precisa',
      'Fotos / video reales',
      'Disponibilidad no confirmada recientemente',
    ]);
    expect(getPropertyVerificationBadge(property)).toEqual({
      score: 4,
      max: 5,
      label: '4 de 5 comprobaciones',
      summaryLabel: '4 de 5 comprobaciones',
      compactLabel: '4/5 verificado',
      visual: '●●●●○',
      spacedVisual: '● ● ● ● ○',
    });
  });

  test('builds the detail summary from the same verification source', () => {
    const details = getPropertyVerificationDetails({
      identityValidated: true,
      locationVerified: true,
      materialVerified: true,
      videoValidated: false,
    });

    expect(details.summaryLabel).toBe('3 de 5 comprobaciones');
    expect(details.spacedVisual).toBe('● ● ● ○ ○');
    expect(details.helperText).toBe('Ves las 5 comprobaciones reales, lo ya confirmado y lo que todavía falta validar.');
    expect(details.items.map((item) => item.status)).toEqual(['complete', 'complete', 'pending', 'complete', 'pending']);
  });

  test('ignores legacy price and generic data items when normalizing explicit verification arrays', () => {
    const details = getPropertyVerificationDetails({
      verificationItems: [
        { key: 'identity', status: 'complete' },
        { key: 'price', label: 'Precio', status: 'complete' },
        { key: 'data', label: 'Datos', status: 'complete' },
        { key: 'visual', status: 'complete' },
      ],
    });

    expect(details.score).toBe(2);
    expect(details.items).toHaveLength(5);
    expect(details.items.find((item) => item.key === 'identity')?.status).toBe('complete');
    expect(details.items.find((item) => item.key === 'photos')?.status).toBe('complete');
    expect(details.items.find((item) => item.key === 'geolocation')?.status).toBe('pending');
    expect(details.items.find((item) => item.key === 'availability')?.status).toBe('pending');
  });

  test('does not infer availability from legacy relationship flags alone', () => {
    const details = getPropertyVerificationDetails({
      identityValidated: true,
      locationVerified: true,
      propertyRelationshipVerified: true,
    });

    expect(details.summaryLabel).toBe('2 de 5 comprobaciones');
    expect(details.items.find((item) => item.key === 'availability')).toEqual({
      key: 'availability',
      label: 'Disponibilidad no confirmada recientemente',
      description: 'Responder o confirmar fechas valida este punto.',
      status: 'pending',
    });
  });

  test('derives Explore guidance labels from the real verification score and top-result position', () => {
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 4 }, { isTopResult: true })).toBe('Más verificado');
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 4 }, { isTopResult: false })).toBeNull();
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 3 }, { isTopResult: false })).toBeNull();
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 2 }, { isTopResult: true })).toBeNull();
  });

  test('derives the detail guidance message from the real verification score', () => {
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 4 })).toBe('Este aviso muestra más comprobaciones reales que la mayoría.');
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 3 })).toBe('Este aviso ya tiene varias comprobaciones visibles.');
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 2 })).toBeNull();
  });

  test('sorts first by verification score and then by verified location', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', identityValidated: true, verificationPhotoCount: 2, availabilityValidated: true, price: 90_000 },
      { id: 'p2', locationVerified: true, lat: -37.0, lng: -56.8, verificationPhotoCount: 2, price: 120_000 },
      { id: 'p3', identityValidated: true, locationVerified: true, lat: -37.1, lng: -56.9, verificationPhotoCount: 2, price: 130_000 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p2', 'p1']);
  });

  test('uses host confirmation after location when the score is tied', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', locationVerified: true, lat: -37.0, lng: -56.8, verificationPhotoCount: 2, price: 120_000 },
      { id: 'p2', identityValidated: true, locationVerified: true, verificationPhotoCount: 2, price: 120_000 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1']);
  });

  test('uses validated availability after location and host when the score is tied', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', identityValidated: true, locationVerified: true, verificationPhotoCount: 2, price: 120_000 },
      { id: 'p2', identityValidated: true, locationVerified: true, availabilityValidated: true, price: 120_000 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1']);
  });

  test('uses price per guest when the verification tie breakers are still equal', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', identityValidated: true, locationVerified: true, availabilityValidated: true, price: 100_000, maxGuests: 2 },
      { id: 'p2', identityValidated: true, locationVerified: true, availabilityValidated: true, price: 120_000, maxGuests: 4 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1']);
  });

  test('sorts by price when selected and keeps verification as a tie breaker only for ties', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', verificationScore: 2, rating: 4.7, price: 100_000 },
      { id: 'p2', verificationScore: 4, rating: 4.1, price: 100_000 },
      { id: 'p3', verificationScore: 5, rating: 4.9, price: 120_000 },
    ], 'price');

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1', 'p3']);
  });

  test('uses search relevance before the remaining secondary signals when verification still ties', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', title: 'Casa con jardín', location: 'Pinamar norte', verificationScore: 4, rating: 4.7, reviewsCount: 8, price: 110_000 },
      { id: 'p2', title: 'Casa cerca del centro', location: 'Villa Gesell centro', verificationScore: 4, rating: 4.7, reviewsCount: 8, price: 105_000 },
      { id: 'p3', title: 'Departamento con balcón', location: 'Villa Gesell sur', verificationScore: 4, rating: 4.5, reviewsCount: 12, price: 99_000 },
    ], 'verification', { searchQuery: 'Villa Gesell' });

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p3', 'p1']);
  });

  test('uses rating and reviews as tie breakers when verification scores are equal', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', verificationScore: 4, rating: 4.7, reviewsCount: 6, price: 120_000, hostPremiumDocumentaryVerified: false, hasPresencialVerification: false },
      { id: 'p2', verificationScore: 4, rating: 4.9, reviewsCount: 4, price: 120_000, hostPremiumDocumentaryVerified: true, hasPresencialVerification: false },
      { id: 'p3', verificationScore: 4, rating: 4.9, reviewsCount: 8, price: 120_000, hostPremiumDocumentaryVerified: true, hasPresencialVerification: true },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p2', 'p1']);
  });

  test('uses internal listing quality when verification is tied', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'p1',
        verificationScore: 4,
        rating: 4.8,
        reviewsCount: 6,
        price: 120_000,
        imageUrl: 'https://example.com/cover-1.jpg',
        location: 'Santa Teresita',
        description: 'Casa simple.',
      },
      {
        id: 'p2',
        verificationScore: 4,
        rating: 4.8,
        reviewsCount: 6,
        price: 120_000,
        imageUrl: 'https://example.com/cover-2.jpg',
        images: [
          'https://example.com/cover-2.jpg',
          'https://example.com/living-2.jpg',
          'https://example.com/room-2.jpg',
          'https://example.com/bath-2.jpg',
        ],
        location: 'Santa Teresita · centro, cerca de la playa',
        description: 'Departamento luminoso, con cocina equipada y una zona facil para llegar caminando a la playa y al centro.',
      },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1']);
  });
});
