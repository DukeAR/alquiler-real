import { describe, expect, test } from 'vitest';

import { getPropertyCardVerificationState } from '../../lib/propertyVerification';
import { demoProperties } from '../demoData';

describe('demoProperties', () => {
  test('keeps the three public verification levels visible in the demo catalog', () => {
    const states = demoProperties.map((property) => ({
      id: property.id,
      publicLevel: getPropertyCardVerificationState(property).publicLevel,
    }));

    expect(states.some((entry) => entry.publicLevel === 'presencial')).toBe(true);
    expect(states.some((entry) => entry.publicLevel === 'identity')).toBe(true);

    const unverifiedIds = states
      .filter((entry) => entry.publicLevel === 'none')
      .map((entry) => entry.id);

    expect(unverifiedIds).toEqual(expect.arrayContaining(['3', '5', '6', '7']));
    expect(unverifiedIds.length).toBeGreaterThanOrEqual(4);
  });
});