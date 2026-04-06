import { describe, expect, test } from 'vitest';
import { getHostTrust, getHostTrustLevelLabel, hasHighHostTrust } from '../hostTrust';

describe('hostTrust', () => {
  test('normalizes the API host trust payload', () => {
    const trust = getHostTrust({
      hostTrustScore: 4,
      hostTrust: {
        score: 4,
        level: 'high',
        items: [
          { key: 'identity', label: 'Identidad confirmada', description: 'Identidad ya confirmada.', status: 'complete' },
          { key: 'reservations', label: 'Historial de reservas', description: '6 reservas completadas.', status: 'complete' },
          { key: 'reviews', label: 'Reseñas de huéspedes', description: '4 reseñas de huéspedes.', status: 'complete' },
          { key: 'tenure', label: 'Antigüedad en la plataforma', description: '3 años en la plataforma.', status: 'complete' },
        ],
      },
    });

    expect(trust.score).toBe(4);
    expect(trust.level).toBe('high');
    expect(trust.items).toHaveLength(4);
    expect(getHostTrustLevelLabel(trust.level)).toBe('Alto');
    expect(hasHighHostTrust({ hostTrust: trust })).toBe(true);
  });

  test('derives the level from the score when only the score is available', () => {
    expect(getHostTrust({ hostTrustScore: 2 })).toMatchObject({ score: 2, level: 'medium' });
    expect(getHostTrust({ hostTrustScore: 0 })).toMatchObject({ score: 0, level: 'low' });
  });
});