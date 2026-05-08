import { describe, expect, test } from 'vitest';
import { getReservationFlowCopy, getReservationFlowMilestones } from '../reservationFlow';

describe('reservationFlow milestones', () => {
  test('shows review as the current protected deposit milestone when an arrival problem is reported', () => {
    const milestones = getReservationFlowMilestones({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'review',
      viewerRole: 'guest',
    });

    expect(milestones).toEqual([
      { key: 'request', label: 'Solicitud enviada', state: 'completed' },
      { key: 'accepted', label: 'Aceptada', state: 'completed' },
      { key: 'deposit', label: 'Seña en revisión', state: 'current' },
      { key: 'confirmed', label: 'Confirmada', state: 'upcoming' },
    ]);
  });

  test('shows arrival review as the current protected deposit milestone for no-show reviews', () => {
    const milestones = getReservationFlowMilestones({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'pending_confirmation',
      viewerRole: 'host',
    });

    expect(milestones).toEqual([
      { key: 'request', label: 'Solicitud recibida', state: 'completed' },
      { key: 'accepted', label: 'Aceptada', state: 'completed' },
      { key: 'deposit', label: 'Llegada en revisión', state: 'current' },
      { key: 'confirmed', label: 'Confirmada', state: 'upcoming' },
    ]);
  });

  test('prioritizes the neutral no-advance state over a cancelled protected placeholder booking', () => {
    const flow = getReservationFlowCopy({
      mode: 'protected',
      requestStatus: 'not_advanced',
      bookingStatus: 'cancelled',
      viewerRole: 'guest',
    });

    expect(flow.stage).toBe('request-not-advanced');
    expect(flow.statusLabel).toBe('No avanzó');
    expect(flow.description).toBe('No se pudo avanzar con esta reserva.');
    expect(flow.supportText).toBe('El anfitrión no puede avanzar en este momento. Podés seguir conversando o buscar otras opciones.');
  });

  test('treats an accepted protected reservation without a stored deposit type as the protected base state', () => {
    const flow = getReservationFlowCopy({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      viewerRole: 'guest',
    });

    expect(flow.stage).toBe('protected-checkout-pending');
    expect(flow.modelLabel).toBe('Seña protegida');
    expect(flow.statusLabel).toBe('Seña protegida');
    expect(flow.nextActorLabel).toBe('Plataforma');
    expect(flow.trackingHint).toBe('Por ahora solo mostramos la estructura y el estado base: el cobro todavía no se procesa dentro de la app.');
  });

  test('shows operation-free copy once a direct request is accepted', () => {
    const flow = getReservationFlowCopy({
      mode: 'direct',
      requestStatus: 'accepted',
      viewerRole: 'guest',
    });

    expect(flow.stage).toBe('request-accepted');
    expect(flow.modelLabel).toBe('Operación libre');
    expect(flow.statusLabel).toBe('Operación libre');
    expect(flow.supportText).toBe('Desde acá coordinan por chat. La app no retiene dinero, no protege la seña ni interviene en pagos externos.');
    expect(flow.nextStepLabel).toBe('Coordinar todo por chat');
  });
});