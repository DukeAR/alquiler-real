import { describe, expect, test } from 'vitest';
import {
  getPropertyVerificationDetails,
  getPropertyVerificationBadge,
  getPropertyVerificationGuidanceLabel,
  getPropertyVerificationGuidanceMessage,
  getPropertyVerificationItems,
  getPropertyVerificationScore,
  meetsRealVerificationFilter,
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
      'Identidad del anfitrión validada en la plataforma',
      'Ubicación del aviso cargada',
      'Punto exacto del aviso',
      'Respaldo visual del aviso',
      'Disponibilidad pendiente de confirmación',
    ]);
    expect(getPropertyVerificationBadge(property)).toEqual({
      score: 0,
      max: 4,
      label: 'Información publicada por el anfitrión',
      summaryLabel: 'Información publicada por el anfitrión',
      compactLabel: 'Información publicada por el anfitrión',
      countLabel: 'Información publicada por el anfitrión',
      levelLabel: 'Información publicada por el anfitrión',
      description: 'La información visible de este aviso fue publicada por el anfitrión.',
      isFullyVerified: false,
      isCoordinationReady: false,
    });
  });

  test('builds the detail summary from the same verification source', () => {
    const details = getPropertyVerificationDetails({
      identityValidated: true,
      locationVerified: true,
      materialVerified: true,
      videoValidated: false,
    });

    expect(details.summaryLabel).toBe('Información publicada por el anfitrión');
    expect(details.compactLabel).toBe('Información publicada por el anfitrión');
    expect(details.description).toBe('La información visible de este aviso fue publicada por el anfitrión.');
    expect(details.helperText).toBe('No evaluamos estado ni calidad del inmueble.');
    expect(details.items).toEqual([]);
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

    expect(details.score).toBe(0);
    expect(details.items).toHaveLength(0);
    expect(details.items.find((item) => item.key === 'locationConfirmed')).toBeUndefined();
    expect(details.items.find((item) => item.key === 'realPropertyAccess')).toBeUndefined();
    expect(details.items.find((item) => item.key === 'relationshipProof')).toBeUndefined();
  });

  test('does not expose relationship or location checks without presencial verification', () => {
    const details = getPropertyVerificationDetails({
      identityValidated: true,
      locationVerified: true,
      propertyRelationshipVerified: true,
    });

    expect(details.summaryLabel).toBe('Información publicada por el anfitrión');
    expect(details.items).toEqual([]);
  });

  test('only exposes an explore guidance label for presencial verification', () => {
    expect(getPropertyVerificationGuidanceLabel({ hasPresencialVerification: true }, { isTopResult: true })).toBe('Verificado presencialmente');
    expect(getPropertyVerificationGuidanceLabel({ hasPresencialVerification: true }, { isTopResult: false })).toBe('Verificado presencialmente');
    expect(getPropertyVerificationGuidanceLabel({ identityValidated: true }, { isTopResult: true })).toBeNull();
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 4 }, { isTopResult: true })).toBeNull();
  });

  test('derives the detail guidance message from the visible verification level', () => {
    expect(getPropertyVerificationGuidanceMessage({ hasPresencialVerification: true })).toBe('Este aviso tiene verificación presencial.');
    expect(getPropertyVerificationGuidanceMessage({ identityValidated: true })).toBeNull();
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 2 })).toBeNull();
  });

  test('requires explicit presencial verification and never infers it from partial signals', () => {
    const fullyVerified = getPropertyVerificationBadge({
      identityValidated: true,
      locationVerified: true,
      verificationPhotoCount: 3,
      availabilityValidated: true,
      coordinates: { lat: -36.7, lng: -56.7 },
      hasPresencialVerification: false,
    });

    const incompletePremiumFlag = getPropertyVerificationBadge({
      identityValidated: true,
      locationVerified: true,
      verificationPhotoCount: 3,
      availabilityValidated: false,
      coordinates: { lat: -36.7, lng: -56.7 },
      hasPresencialVerification: true,
    });

    expect(fullyVerified.summaryLabel).toBe('Información publicada por el anfitrión');
    expect(fullyVerified.isFullyVerified).toBe(false);
    expect(incompletePremiumFlag.summaryLabel).toBe('Verificación presencial');
    expect(incompletePremiumFlag.isFullyVerified).toBe(true);
    expect(meetsRealVerificationFilter({
      identityValidated: true,
      locationVerified: true,
      verificationPhotoCount: 3,
      availabilityValidated: true,
      coordinates: { lat: -36.7, lng: -56.7 },
      hasPresencialVerification: false,
    })).toBe(false);
    expect(meetsRealVerificationFilter({
      identityValidated: true,
      locationVerified: true,
      verificationPhotoCount: 3,
      availabilityValidated: false,
      coordinates: { lat: -36.7, lng: -56.7 },
      hasPresencialVerification: true,
    })).toBe(true);
  });

  test('keeps presencial verification above lower levels', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'p1',
        identityValidated: true,
        locationVerified: true,
        verificationPhotoCount: 3,
        availabilityValidated: true,
        coordinates: { lat: -36.71, lng: -56.71 },
        hasPresencialVerification: false,
        price: 120_000,
      },
      {
        id: 'p2',
        identityValidated: true,
        locationVerified: true,
        verificationPhotoCount: 3,
        availabilityValidated: true,
        coordinates: { lat: -36.7, lng: -56.7 },
        hasPresencialVerification: true,
        price: 125_000,
      },
      {
        id: 'p3',
        identityValidated: true,
        locationVerified: true,
        verificationPhotoCount: 2,
        coordinates: { lat: -36.69, lng: -56.69 },
        price: 110_000,
      },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1', 'p3']);
  });

  test('sorts first by visible level and then by the internal tie breakers', () => {
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
