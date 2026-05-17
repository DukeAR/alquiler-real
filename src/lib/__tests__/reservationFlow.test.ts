import { describe, expect, test } from 'vitest';
import { getReservationFlowCopy, getReservationFlowMilestones, getReservationFlowState, getReservationFlowTimeline } from '../reservationFlow';

describe('reservationFlow milestones', () => {
  test('shows manual review at the check-in stage of the operational timeline', () => {
    const timeline = getReservationFlowTimeline({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'manual_review',
      viewerRole: 'guest',
    });

    expect(timeline).toEqual({
      currentStepKey: 'checkin',
      status: { label: 'En revisión manual', tone: 'warning' },
      steps: [
        { key: 'inquiry', label: 'Consulta iniciada', state: 'completed' },
        { key: 'request', label: 'Reserva solicitada', state: 'completed' },
        { key: 'deposit', label: 'Seña reportada', state: 'completed' },
        { key: 'confirmation', label: 'Confirmación pendiente', state: 'completed' },
        { key: 'checkin', label: 'Check-in pendiente', state: 'current' },
        { key: 'completed', label: 'Operación completada', state: 'upcoming' },
      ],
    });
  });

  test('keeps milestone consumers aligned with the shared 6-step timeline', () => {
    const milestones = getReservationFlowMilestones({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'manual_review',
      viewerRole: 'host',
    });

    expect(milestones).toEqual([
      { key: 'inquiry', label: 'Consulta iniciada', state: 'completed' },
      { key: 'request', label: 'Reserva solicitada', state: 'completed' },
      { key: 'deposit', label: 'Seña reportada', state: 'completed' },
      { key: 'confirmation', label: 'Confirmación pendiente', state: 'completed' },
      { key: 'checkin', label: 'Check-in pendiente', state: 'current' },
      { key: 'completed', label: 'Operación completada', state: 'upcoming' },
    ]);
  });

  test('surfaces the requested waiting variants for host response and guest confirmation', () => {
    expect(getReservationFlowTimeline({
      mode: 'protected',
      requestStatus: 'pending',
      viewerRole: 'guest',
    })).toMatchObject({
      currentStepKey: 'request',
      status: { label: 'Esperando respuesta del anfitrión', tone: 'brand' },
    });

    expect(getReservationFlowTimeline({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'held',
      startDate: '2000-01-01',
      viewerRole: 'host',
    })).toMatchObject({
      currentStepKey: 'checkin',
      status: { label: 'Esperando confirmación del huésped', tone: 'brand' },
    });
  });

  test('prioritizes the neutral no-advance state over a cancelled protected placeholder booking', () => {
    const flow = getReservationFlowCopy({
      mode: 'protected',
      requestStatus: 'not_advanced',
      bookingStatus: 'cancelled',
      viewerRole: 'guest',
    });

    expect(flow.stage).toBe('request-not-advanced');
    expect(flow.state).toBe('cancelled');
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
    expect(flow.state).toBe('deposit_pending');
    expect(flow.modelLabel).toBe('Seña Protegida');
    expect(flow.statusLabel).toBe('Seña pendiente');
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
    expect(flow.state).toBe('free_operation_selected');
    expect(flow.modelLabel).toBe('Operación libre');
    expect(flow.statusLabel).toBe('Operación libre');
    expect(flow.supportText).toBe('Desde acá coordinan por chat. La app no retiene dinero, no registra la seña dentro del flujo ni interviene en pagos externos.');
    expect(flow.nextStepLabel).toBe('Coordinar todo por chat');
  });

  test('maps a protected checkout flow to deposit_pending', () => {
    expect(getReservationFlowState({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'pending',
      depositStatus: 'checkout_pending',
    })).toBe('deposit_pending');
  });

  test('maps a held protected deposit before check-in to deposit_confirmed', () => {
    expect(getReservationFlowState({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'held',
      startDate: '2099-01-01',
    })).toBe('deposit_confirmed');
  });

  test('maps a held protected deposit on or after check-in to checkin_pending', () => {
    expect(getReservationFlowState({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'held',
      startDate: '2000-01-01',
    })).toBe('checkin_pending');
  });

  test('supports explicit guest and host confirmation states when those signals exist', () => {
    expect(getReservationFlowState({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'held',
      startDate: '2000-01-01',
      guestCheckinConfirmed: true,
    })).toBe('guest_checkin_confirmed');

    expect(getReservationFlowState({
      mode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'held',
      startDate: '2000-01-01',
      hostAccessConfirmed: true,
    })).toBe('host_access_confirmed');
  });
});