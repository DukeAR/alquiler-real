import { describe, expect, test } from 'vitest';
import { buildPropertyVerificationProgress, buildPropertyVerificationSummary } from '../verificationModel';

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
    expect(progress.nextStep).toBe('Falta confirmar disponibilidad reciente.');
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
    expect(progress.nextStep).toBe('Falta sumar respaldo visual del aviso.');
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
    expect(progress.nextStep).toBe('Falta sumar respaldo visual del aviso.');
  });

  test('keeps a neutral low-confidence summary for listings missing key basics', () => {
    const progress = buildPropertyVerificationProgress({
      materialVerified: true,
      availabilityValidated: true,
    });

    expect(progress.level).toBe('base');
    expect(progress.summary).toBe('Todavía falta información clave para decidir.');
    expect(progress.nextStep).toBe('Falta validar la identidad del anfitrión.');
  });

  test('uses actionable pending labels and descriptions for media and availability', () => {
    const summary = buildPropertyVerificationSummary({
      identityValidated: true,
      locationVerified: true,
      lat: -36.7,
      lng: -56.7,
    });

    expect(summary.items.find((item) => item.key === 'photos')).toEqual({
      key: 'photos',
      label: 'Falta respaldo visual del aviso',
      status: 'pending',
      description: 'Sumar fotos del lugar ayuda a que el aviso se entienda mejor.',
    });
    expect(summary.items.find((item) => item.key === 'availability')).toEqual({
      key: 'availability',
      label: 'Disponibilidad pendiente de confirmación',
      status: 'pending',
      description: 'Responder o confirmar fechas actualiza este punto.',
    });
  });
});