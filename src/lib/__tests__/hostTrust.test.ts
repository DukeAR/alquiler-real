import { describe, expect, test } from 'vitest';
import { getHostTrust, getHostTrustLevelLabel, hasHighHostTrust } from '../hostTrust';

describe('hostTrust', () => {
  test('normalizes the API host trust payload', () => {
    const trust = getHostTrust({
      hostTrust: {
        score: 4,
        level: 'high',
        items: [
          { key: 'identity', label: 'Identidad validada', description: 'La identidad del anfitrión ya fue validada.', status: 'complete' },
          { key: 'onsite', label: 'Verificación presencial', description: 'Todavía no hay una verificación presencial registrada.', status: 'pending' },
          { key: 'response', label: 'Responde en ~18 min', description: 'Promedio de primera respuesta visible: ~18 min.', status: 'complete' },
          { key: 'operations', label: '6 operaciones completadas', description: '6 operaciones completadas dentro de la plataforma.', status: 'complete' },
          { key: 'tenure', label: '3 años en la plataforma', description: '3 años en la plataforma.', status: 'complete' },
        ],
      },
    });

    expect(trust.score).toBe(4);
    expect(trust.level).toBe('high');
    expect(trust.items).toHaveLength(5);
    expect(getHostTrustLevelLabel(trust.level)).toBe('Alto');
    expect(hasHighHostTrust({ hostTrust: trust })).toBe(true);
  });

  test('derives the level from the structured host trust score when the level is absent', () => {
    expect(getHostTrust({ hostTrust: { score: 4, items: [] } })).toMatchObject({ score: 4, level: 'high' });
    expect(getHostTrust({ hostTrust: { score: 2, items: [] } })).toMatchObject({ score: 2, level: 'medium' });
    expect(getHostTrust({ hostTrust: { score: 0, items: [] } })).toMatchObject({ score: 0, level: 'low' });
  });
});