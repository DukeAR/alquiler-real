import { describe, expect, test } from 'vitest';
import { getPropertyListingQualityScore } from '../propertyListingQuality';

describe('propertyListingQuality', () => {
  test('scores richer listings above bare minimum ones', () => {
    const minimal = getPropertyListingQualityScore({
      imageUrl: 'https://example.com/cover.jpg',
      location: 'San Clemente del Tuyu',
      description: 'Lugar simple.',
    });

    const clearer = getPropertyListingQualityScore({
      imageUrl: 'https://example.com/cover.jpg',
      images: [
        'https://example.com/cover.jpg',
        'https://example.com/living.jpg',
        'https://example.com/room.jpg',
        'https://example.com/bath.jpg',
      ],
      location: 'San Clemente del Tuyu · playa norte',
      description: 'Departamento luminoso con living comodo, cocina equipada y una zona tranquila para caminar a la playa sin depender del auto.',
    });

    expect(clearer).toBeGreaterThan(minimal);
  });

  test('rewards clearer location references', () => {
    const broad = getPropertyListingQualityScore({
      imageUrl: 'https://example.com/cover.jpg',
      location: 'Las Toninas',
    });

    const detailed = getPropertyListingQualityScore({
      imageUrl: 'https://example.com/cover.jpg',
      location: 'Las Toninas · centro, cerca de la playa',
    });

    expect(detailed).toBeGreaterThan(broad);
  });
});