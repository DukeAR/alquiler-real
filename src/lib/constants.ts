/**
 * Constantes globales de la aplicación
 */

export const VALID_ZONES = [
  'San Clemente del Tuyú',
  'Las Toninas',
  'Santa Teresita',
  'Mar del Tuyú'
] as const;

export type Zone = typeof VALID_ZONES[number];

/**
 * Validar y normalizar zona
 */
export const normalizeZone = (zone: string): Zone | null => {
  if (!zone) return null;
  const normalized = VALID_ZONES.find(z => z.toLowerCase() === zone.toLowerCase());
  return normalized || null;
};
