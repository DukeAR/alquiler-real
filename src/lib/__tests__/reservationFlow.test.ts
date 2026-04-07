import { describe, expect, test } from 'vitest';
import { getReservationFlowMilestones } from '../reservationFlow';

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

  test('shows pending confirmation as the current protected deposit milestone for no-show reviews', () => {
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
      { key: 'deposit', label: 'Pendiente de confirmación', state: 'current' },
      { key: 'confirmed', label: 'Confirmada', state: 'upcoming' },
    ]);
  });
});