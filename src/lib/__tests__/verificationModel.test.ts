import { describe, expect, test } from 'vitest';
import { buildPropertyVerificationProgress } from '../verificationModel';

describe('buildPropertyVerificationProgress', () => {
  test('uses a ready-to-coordinate summary for listings with 4 visible checks', () => {
    const progress = buildPropertyVerificationProgress({
      identityValidated: true,
      locationVerified: true,
      lat: -36.7,
      lng: -56.7,
      materialVerified: true,
    });

    expect(progress.level).toBe('medium');
    expect(progress.summary).toBe('Listo para coordinar.');
    expect(progress.nextStep).toBe('Disponibilidad no confirmada recientemente.');
  });

  test('uses a medium decision summary when there is still visible information to complete', () => {
    const progress = buildPropertyVerificationProgress({
      identityValidated: true,
      locationVerified: true,
      lat: -36.7,
      lng: -56.7,
    });

    expect(progress.level).toBe('medium');
    expect(progress.summary).toBe('Podés avanzar, pero hay información a completar.');
    expect(progress.nextStep).toBe('Falta validar fotos o video.');
  });

  test('prioritizes the missing photos message before other pending visible checks', () => {
    const progress = buildPropertyVerificationProgress({
      identityValidated: true,
      locationVerified: true,
      lat: -36.7,
      lng: -56.7,
      availabilityValidated: true,
    });

    expect(progress.summary).toBe('Listo para coordinar.');
    expect(progress.nextStep).toBe('Falta validar fotos o video.');
  });

  test('keeps a neutral low-confidence summary for listings missing key basics', () => {
    const progress = buildPropertyVerificationProgress({
      materialVerified: true,
      availabilityValidated: true,
    });

    expect(progress.level).toBe('base');
    expect(progress.summary).toBe('Todavía falta información clave para decidir.');
    expect(progress.nextStep).toBe('Falta confirmar la identidad del anfitrión.');
  });
});