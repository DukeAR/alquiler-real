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
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      propertyRelationshipVerified: true,
      hasPresencialVerification: true,
    });

    expect(property.verificationScore).toBe(4);
    expect(getPropertyVerificationScore(property)).toBe(4);
    expect(getPropertyVerificationItems(property).map((item) => item.label)).toEqual([
      'Identidad confirmada',
      'Ubicación verificada',
      'Material real del lugar',
      'Relación con la propiedad',
      'Verificación presencial',
    ]);
    expect(getPropertyVerificationBadge(property)).toEqual({
      score: 4,
      max: 5,
      label: '4 de 5 comprobaciones completas',
      summaryLabel: '4 de 5 comprobaciones completas',
      visual: '✔✔✔✔○',
      spacedVisual: '✔ ✔ ✔ ✔ ○',
    });
  });

  test('builds the detail summary from the same verification source', () => {
    const details = getPropertyVerificationDetails({
      identityValidated: true,
      locationVerified: true,
      videoValidated: true,
      propertyRelationshipVerified: false,
      hasPresencialVerification: false,
    });

    expect(details.summaryLabel).toBe('3 de 5 comprobaciones completas');
    expect(details.spacedVisual).toBe('✔ ✔ ✔ ○ ○');
    expect(details.helperText).toBe('Mostramos qué está comprobado para que puedas decidir mejor.');
    expect(details.items.map((item) => item.status)).toEqual(['complete', 'complete', 'complete', 'pending', 'pending']);
  });

  test('derives Explore guidance labels from the real verification score and top-result position', () => {
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 4 }, { isTopResult: true })).toBe('Más comprobado');
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 4 }, { isTopResult: false })).toBeNull();
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 3 }, { isTopResult: false })).toBeNull();
    expect(getPropertyVerificationGuidanceLabel({ verificationScore: 2 }, { isTopResult: true })).toBeNull();
  });

  test('derives the detail guidance message from the real verification score', () => {
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 4 })).toBe('Este aviso muestra más información validada que la mayoría.');
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 3 })).toBe('Este aviso ya tiene varias comprobaciones visibles.');
    expect(getPropertyVerificationGuidanceMessage({ verificationScore: 2 })).toBeNull();
  });

  test('sorts first by verification score and then by rating', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', verificationScore: 3, rating: 4.9, price: 90_000 },
      { id: 'p2', verificationScore: 5, rating: 4.2, price: 120_000 },
      { id: 'p3', verificationScore: 5, rating: 4.8, price: 130_000 },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p2', 'p1']);
  });

  test('sorts by price while keeping verification as a tie breaker', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', verificationScore: 2, rating: 4.7, price: 100_000 },
      { id: 'p2', verificationScore: 4, rating: 4.1, price: 100_000 },
      { id: 'p3', verificationScore: 5, rating: 4.9, price: 120_000 },
    ], 'price');

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p2', 'p1']);
  });

  test('uses search relevance after respaldo and reseñas when comparing similar results', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', title: 'Casa con jardín', location: 'Pinamar norte', verificationScore: 4, rating: 4.7, reviewsCount: 8, price: 110_000 },
      { id: 'p2', title: 'Casa cerca del centro', location: 'Villa Gesell centro', verificationScore: 4, rating: 4.7, reviewsCount: 8, price: 105_000 },
      { id: 'p3', title: 'Departamento con balcón', location: 'Villa Gesell sur', verificationScore: 4, rating: 4.5, reviewsCount: 12, price: 99_000 },
    ], 'verification', { searchQuery: 'Villa Gesell' });

    expect(sorted.map((property) => property.id)).toEqual(['p2', 'p1', 'p3']);
  });

  test('uses the premium visibility boost as a tie breaker when verification scores are equal', () => {
    const sorted = sortPropertiesByCatalogOrder([
      { id: 'p1', verificationScore: 4, rating: 4.7, reviewsCount: 6, price: 120_000, hostPremiumDocumentaryVerified: false, hasPresencialVerification: false },
      { id: 'p2', verificationScore: 4, rating: 4.7, reviewsCount: 6, price: 120_000, hostPremiumDocumentaryVerified: true, hasPresencialVerification: false },
      { id: 'p3', verificationScore: 4, rating: 4.7, reviewsCount: 6, price: 120_000, hostPremiumDocumentaryVerified: true, hasPresencialVerification: true },
    ], 'verification');

    expect(sorted.map((property) => property.id)).toEqual(['p3', 'p2', 'p1']);
  });
});
