import { describe, expect, test } from 'vitest';

import { buildDemoData } from '../demoData';

describe('server demo data', () => {
  test('includes presencial, identity-only, and unverified publications', () => {
    const { properties } = buildDemoData(new Date('2026-05-02T12:00:00.000Z'));

    const presencialProperties = properties.filter((property) => property.hasPresencialVerification);
    const identityOnlyProperties = properties.filter((property) => property.identityValidated && !property.hasPresencialVerification);
    const unverifiedProperties = properties.filter((property) => !property.identityValidated && !property.hasPresencialVerification);

    expect(presencialProperties.length).toBeGreaterThan(0);
    expect(identityOnlyProperties.length).toBeGreaterThan(0);
    expect(unverifiedProperties.length).toBeGreaterThanOrEqual(4);
    expect(unverifiedProperties.map((property) => property.id)).toEqual(expect.arrayContaining([
      'demo_prop_estudio_nuevo_1',
      'demo_prop_casa_nueva_1',
      'demo_prop_duplex_basico_1',
      'demo_prop_ph_inicial_1',
    ]));
  });
});