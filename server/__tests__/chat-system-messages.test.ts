import { describe, expect, test } from 'vitest';

import { CHAT_SYSTEM_MESSAGE_COPY, getChatSystemMessages } from '../chatSystemMessages';

describe('chatSystemMessages', () => {
  test('shows the conversation start guidance for an exploratory chat', () => {
    const messages = getChatSystemMessages({});

    expect(messages).toEqual([
      {
        key: 'conversation-start',
        content: CHAT_SYSTEM_MESSAGE_COPY['conversation-start'],
      },
    ]);
    expect(messages[0]?.content).toBe('Podés hablar y coordinar todo por acá sin salir de Alquiler Real.');
  });

  test('adds request sent guidance for a pending reservation request', () => {
    const messages = getChatSystemMessages({
      requestMode: 'direct',
      requestStatus: 'pending',
      requestStartDate: '2026-05-10',
      requestEndDate: '2026-05-13',
      today: '2026-05-01',
    });

    expect(messages.map((message) => message.key)).toEqual([
      'conversation-start',
      'request-sent',
    ]);
    expect(messages[1]?.content).toBe('Propuesta enviada. Ahora le toca responder al anfitrión.');
  });

  test('adds acceptance and protected-state guidance before any payment processing exists', () => {
    const messages = getChatSystemMessages({
      requestMode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      requestStartDate: '2026-06-10',
      requestEndDate: '2026-06-15',
      bookingStartDate: '2026-06-10',
      bookingEndDate: '2026-06-15',
      today: '2026-05-20',
    });

    expect(messages.map((message) => message.key)).toEqual([
      'conversation-start',
      'request-sent',
      'request-accepted',
      'protected-payment',
    ]);
    expect(messages[2]?.content).toBe('Ya están de acuerdo. La reserva quedó marcada con seña protegida.');
    expect(messages[3]?.content).toBe('La reserva quedó marcada con seña protegida. Cuando la seña se registre, queda retenida hasta check-in. Por ahora no procesamos pagos dentro de la app.');
  });

  test('adds the external coordination message with a return path to protected deposit', () => {
    const messages = getChatSystemMessages({
      requestMode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositType: 'external',
      depositStatus: 'external_pending',
      requestStartDate: '2026-06-10',
      requestEndDate: '2026-06-15',
      bookingStartDate: '2026-06-10',
      bookingEndDate: '2026-06-15',
      today: '2026-05-20',
    });

    expect(messages.map((message) => message.key)).toEqual([
      'conversation-start',
      'request-sent',
      'request-accepted',
      'external-deposit',
    ]);
    expect(messages[3]?.content).toBe('Esta reserva quedó en operación libre. Toda la coordinación sigue por chat y la app no interviene en pagos externos.');
  });

  test('adds a neutral no-advance system step before any deposit is reported', () => {
    const messages = getChatSystemMessages({
      requestMode: 'direct',
      requestStatus: 'not_advanced',
      requestStartDate: '2026-06-10',
      requestEndDate: '2026-06-15',
      today: '2026-05-20',
    });

    expect(messages.map((message) => message.key)).toEqual([
      'conversation-start',
      'request-sent',
      'request-not-advanced',
    ]);
    expect(messages[2]?.content).toBe('No se pudo avanzar con esta reserva.');
  });

  test('adds post-payment and arrival coordination messages for a direct booking', () => {
    const messages = getChatSystemMessages({
      requestMode: 'direct',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'confirmed',
      requestStartDate: '2026-07-05',
      requestEndDate: '2026-07-09',
      bookingStartDate: '2026-07-05',
      bookingEndDate: '2026-07-09',
      today: '2026-06-25',
    });

    expect(messages.map((message) => message.key)).toEqual([
      'conversation-start',
      'request-sent',
      'request-accepted',
      'direct-after-payment',
      'before-arrival',
    ]);
    expect(messages[2]?.content).toBe('Ya están de acuerdo. Siguen coordinando por este chat.');
    expect(messages[3]?.content).toBe('Reserva confirmada. Ya pueden coordinar la llegada por el chat.');
  });

  test('adds protected arrival and problem guidance when check-in day arrives', () => {
    const messages = getChatSystemMessages({
      requestMode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositStatus: 'held',
      requestStartDate: '2026-08-14',
      requestEndDate: '2026-08-18',
      bookingStartDate: '2026-08-14',
      bookingEndDate: '2026-08-18',
      today: '2026-08-14',
    });

    expect(messages.map((message) => message.key)).toEqual([
      'conversation-start',
      'request-sent',
      'request-accepted',
      'protected-after-payment',
      'before-arrival',
      'protected-arrival',
      'problem',
    ]);
    expect(messages[3]?.content).toBe('Seña registrada y retenida hasta check-in. Ya pueden coordinar la llegada por el chat.');
  });

  test('adds the review prompt after the stay is completed', () => {
    const messages = getChatSystemMessages({
      requestMode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'completed',
      depositStatus: 'deposit_released',
      requestStartDate: '2026-09-02',
      requestEndDate: '2026-09-07',
      bookingStartDate: '2026-09-02',
      bookingEndDate: '2026-09-07',
      today: '2026-09-10',
    });

    expect(messages.at(-1)).toEqual({
      key: 'review-prompt',
      content: CHAT_SYSTEM_MESSAGE_COPY['review-prompt'],
    });
  });
});