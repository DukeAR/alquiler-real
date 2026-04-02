import { describe, test, expect } from 'vitest';
import { FavoritesContext } from '../FavoritesContext';

describe('FavoritesProvider (smoke)', () => {
  test('exports context object', () => {
    expect(FavoritesContext).toBeDefined();
  });
});
