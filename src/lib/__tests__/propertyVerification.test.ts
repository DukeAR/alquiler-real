import { describe, expect, test } from 'vitest';
import {
  buildPropertyCatalogSections,
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
import { ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS } from '../onsiteVerificationProtocol';

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
    expect(details.helperText).toBe('No verificamos calidad del inmueble, limpieza, amenities, funcionamiento técnico, seguridad edilicia ni exactitud absoluta de fotos.');
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
    expect(getPropertyVerificationGuidanceMessage({ hasPresencialVerification: true })).toBe('Este aviso está verificado presencialmente.');
    expect(getPropertyVerificationGuidanceMessage({ identityValidated: true })).toBeNull();
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 2 })).toBeNull();
  });

  test('treats expired onsite verification as needing reverification instead of an active seal', () => {
    const expiredVerificationDate = new Date();
    expiredVerificationDate.setMonth(expiredVerificationDate.getMonth() - (ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS + 1));

    const expiredProperty = {
      hasPresencialVerification: true,
      onsiteVerifiedAt: expiredVerificationDate.toISOString(),
    };

    expect(getPropertyVerificationBadge(expiredProperty).summaryLabel).toBe('Información publicada por el anfitrión');
    expect(getPropertyVerificationGuidanceLabel(expiredProperty, { isTopResult: true })).toBeNull();
    expect(getPropertyVerificationGuidanceMessage(expiredProperty)).toBeNull();
    expect(meetsRealVerificationFilter(expiredProperty)).toBe(false);
  });

  test('keeps reverification-pending listings out of the active presencial tier', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'reverification-pending',
        hasPresencialVerification: true,
        onsiteVerifiedAt: new Date().toISOString(),
        onsiteVerificationMaintenanceStatus: 'reverification_pending',
        identityValidated: true,
        price: 90_000,
      },
      {
        id: 'verified-current',
        hasPresencialVerification: true,
        onsiteVerifiedAt: new Date().toISOString(),
        identityValidated: true,
        price: 110_000,
      },
      {
        id: 'identity-only',
        identityValidated: true,
        price: 70_000,
      },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['verified-current', 'identity-only', 'reverification-pending']);
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
    expect(incompletePremiumFlag.summaryLabel).toBe('Verificado presencialmente');
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

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p1', 'p2']);
  });

  test('keeps visible levels ordered as presencial, identidad y sin validación', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'none', locationVerified: true, verificationPhotoCount: 3, price: 100_000 },
      { id: 'identity', identityValidated: true, price: 95_000 },
      { id: 'presencial', hasPresencialVerification: true, price: 120_000 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['presencial', 'identity', 'none']);
  });

  test('keeps higher visible verification levels ahead of lower ones in verification-first sorting', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'presencial-3', hasPresencialVerification: true, price: 80_000 },
      { id: 'identity-2', identityValidated: true, price: 55_000 },
      { id: 'none-1', price: 40_000 },
      { id: 'presencial-2', hasPresencialVerification: true, price: 70_000 },
      { id: 'identity-1', identityValidated: true, price: 50_000 },
      { id: 'presencial-1', hasPresencialVerification: true, price: 60_000 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual([
      'presencial-1',
      'presencial-2',
      'presencial-3',
      'identity-1',
      'identity-2',
      'none-1',
    ]);
  });

  test('prioritizes the trust score before the older secondary tie breakers', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'fast-host',
        title: 'Casa con anfitrión activo',
        location: 'Pinamar centro',
        description: 'Casa con fotos, descripción completa y buen ritmo de respuesta.',
        imageUrl: 'https://example.com/cover-1.jpg',
        images: [
          'https://example.com/cover-1.jpg',
          'https://example.com/cover-1b.jpg',
          'https://example.com/cover-1c.jpg',
          'https://example.com/cover-1d.jpg',
        ],
        identityValidated: true,
        price: 120_000,
        hostInteractionHistory: {
          completedReservationsCount: 3,
          feedbackCount: 2,
          incidentsCount: 0,
          avgResponseTimeMinutes: 24,
        },
        rating: 4.7,
        reviewsCount: 6,
      },
      {
        id: 'slow-host',
        title: 'Casa con menos señales',
        location: 'Pinamar',
        description: 'Casa con menos respaldo cargado.',
        imageUrl: 'https://example.com/cover-2.jpg',
        identityValidated: true,
        price: 120_000,
        hostInteractionHistory: {
          completedReservationsCount: 0,
          feedbackCount: 0,
          incidentsCount: 0,
          avgResponseTimeMinutes: 180,
        },
        rating: 4.1,
        reviewsCount: 1,
      },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['fast-host', 'slow-host']);
  });

  test('builds contextual section buckets without duplicating listings across them', () => {
    const sections = buildPropertyCatalogSections([
      {
        id: 'presencial-top',
        title: 'Casa verificada',
        location: 'Costa del Este, frente al mar',
        description: 'Casa completa, con varias fotos y buena descripción.',
        imageUrl: 'https://example.com/presencial-cover.jpg',
        images: [
          'https://example.com/presencial-cover.jpg',
          'https://example.com/presencial-1.jpg',
          'https://example.com/presencial-2.jpg',
          'https://example.com/presencial-3.jpg',
        ],
        identityValidated: true,
        hasPresencialVerification: true,
        price: 110_000,
        rating: 4.9,
        reviewsCount: 10,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'identity-first',
        title: 'Depto con identidad validada',
        location: 'Pinamar centro',
        description: 'Departamento con identidad confirmada y buena información publicada.',
        imageUrl: 'https://example.com/identity-cover.jpg',
        images: [
          'https://example.com/identity-cover.jpg',
          'https://example.com/identity-1.jpg',
          'https://example.com/identity-2.jpg',
          'https://example.com/identity-3.jpg',
        ],
        identityValidated: true,
        price: 95_000,
        rating: 4.6,
        reviewsCount: 4,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'near-sea',
        title: 'Casa a metros de la playa',
        location: 'Villa Gesell norte',
        description: 'Ideal para escapadas cortas cerca del mar.',
        imageUrl: 'https://example.com/sea-cover.jpg',
        identityValidated: false,
        price: 102_000,
        maxGuests: 4,
      },
      {
        id: 'large-group',
        title: 'Casa para familias grandes',
        location: 'General Madariaga',
        description: 'Espacio amplio para ir en grupo.',
        imageUrl: 'https://example.com/group-cover.jpg',
        identityValidated: false,
        price: 140_000,
        maxGuests: 8,
      },
      {
        id: 'recent-only',
        title: 'Aviso recién publicado',
        location: 'San Bernardo',
        description: 'Nueva publicación para revisar.',
        imageUrl: 'https://example.com/recent-only-cover.jpg',
        identityValidated: false,
        price: 88_000,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'comparison-base',
        title: 'Casa para comparar',
        location: 'Villa Gesell',
        description: 'Una opción adicional para comparar.',
        imageUrl: 'https://example.com/compare-cover.jpg',
        identityValidated: false,
        price: 88_000,
      },
    ], 'verification');

    expect(sections.topVerified.map((property) => property.id)).toEqual(['presencial-top']);
    expect(sections.identityValidated.map((property) => property.id)).toEqual(['identity-first']);
    expect(sections.nearSea.map((property) => property.id)).toEqual(['near-sea']);
    expect(sections.largeGroups.map((property) => property.id)).toEqual(['large-group']);
    expect(sections.newListings.map((property) => property.id)).toEqual(['recent-only']);
    expect(sections.comparison.map((property) => property.id)).toEqual(['comparison-base']);
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

  test('sorts by highest price when selected and keeps verification as the tie breaker for equal prices', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', verificationScore: 2, price: 100_000 },
      { id: 'p2', verificationScore: 4, price: 100_000 },
      { id: 'p3', verificationScore: 5, price: 120_000 },
    ], 'price-desc');

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p2', 'p1']);
  });

  test('uses search relevance before the remaining secondary signals when verification still ties', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', title: 'Casa con jardín', location: 'Pinamar norte', verificationScore: 4, rating: 4.7, reviewsCount: 8, price: 110_000 },
      { id: 'p2', title: 'Casa cerca del centro', location: 'Villa Gesell centro', verificationScore: 4, rating: 4.7, reviewsCount: 8, price: 105_000 },
      { id: 'p3', title: 'Departamento con balcón', location: 'Villa Gesell sur', verificationScore: 4, rating: 4.5, reviewsCount: 12, price: 99_000 },
    ], 'verification', { searchQuery: 'Villa Gesell' });

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p3', 'p1']);
  });

  test('prioritizes reputation before search relevance when verification ties', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'relevant-but-thin',
        title: 'Casa en Villa Gesell centro',
        location: 'Villa Gesell centro',
        identityValidated: true,
        price: 110_000,
        rating: 4.1,
        reviewsCount: 1,
      },
      {
        id: 'trusted-history',
        title: 'Casa cerca del bosque',
        location: 'Pinamar norte',
        identityValidated: true,
        price: 110_000,
        rating: 4.8,
        reviewsCount: 8,
        hostInteractionHistory: {
          completedReservationsCount: 4,
          feedbackCount: 4,
          incidentsCount: 0,
          avgResponseTimeMinutes: 20,
        },
      },
    ], 'verification', { searchQuery: 'Villa Gesell' });

    expect(sorted.map((property) => property.id)).toEqual(['trusted-history', 'relevant-but-thin']);
  });

  test('prioritizes recent activity before search relevance when reputation ties', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'relevant-only',
        title: 'Departamento en Villa Gesell',
        location: 'Villa Gesell centro',
        identityValidated: true,
        price: 95_000,
        rating: 4.6,
        reviewsCount: 4,
      },
      {
        id: 'recent-active',
        title: 'Departamento listo para este finde',
        location: 'Mar de Ajó',
        identityValidated: true,
        price: 95_000,
        rating: 4.6,
        reviewsCount: 4,
        availabilityValidated: true,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ], 'verification', { searchQuery: 'Villa Gesell' });

    expect(sorted.map((property) => property.id)).toEqual(['recent-active', 'relevant-only']);
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

  test('does not demote a stable listing for one isolated pending report', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'fresh-clean',
        identityValidated: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        price: 100_000,
      },
      {
        id: 'pending-stable',
        identityValidated: true,
        hostSince: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        pendingReportsCount: 1,
        price: 100_000,
      },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['pending-stable', 'fresh-clean']);
  });

  test('keeps confirmed reports below otherwise healthy listings', () => {
    const sorted = sortPropertiesByCatalogOrder([
      {
        id: 'reported-history',
        identityValidated: true,
        hostSince: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        rating: 4.9,
        reviewsCount: 8,
        confirmedReportsCount: 1,
        hostInteractionHistory: {
          completedReservationsCount: 4,
          feedbackCount: 4,
          incidentsCount: 0,
          avgResponseTimeMinutes: 30,
        },
        price: 120_000,
      },
      {
        id: 'clean-neutral',
        identityValidated: true,
        price: 120_000,
      },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['clean-neutral', 'reported-history']);
  });
});
