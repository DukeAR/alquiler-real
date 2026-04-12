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
    expect(messages[0]?.content).toBe('Podés coordinar todo por acá. Evitá compartir datos sensibles o pagos por fuera hasta tener claro el acuerdo.');
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
    expect(messages[1]?.content).toBe('Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.');
  });

  test('adds acceptance and deposit-choice guidance before any deposit is selected', () => {
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
      'before-payment',
      'deposit-choice',
    ]);
    expect(messages[2]?.content).toBe('Ya pueden avanzar con la seña y dejarlo confirmado. Podés resolverla acá para dejar todo claro entre ambos o coordinarla por fuera si preferís.');
    expect(messages[3]?.content).toBe('Antes de avanzar con la seña, confirmá que los datos coincidan con el anfitrión del aviso.');
    expect(messages[4]?.content).toBe('Podés resolver la seña acá para dejar todo claro y confirmado entre ambos. Si preferís, también podés coordinarla por fuera.');
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
    expect(messages[3]?.content).toBe('Eligieron coordinar la seña por fuera. Si cambian de idea antes de informarla, todavía pueden resolverla acá.');
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
    expect(messages[2]?.content).toBe('Ya pueden avanzar con la seña y dejarlo confirmado.');
    expect(messages[3]?.content).toBe('La seña ya quedó confirmada. La reserva está registrada y pueden seguir por chat con la llegada.');
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
    expect(messages[3]?.content).toBe('La seña quedó en custodia. Se libera cuando se confirme la llegada.');
  });

  test('adds the review prompt after the stay is completed', () => {
    const messages = getChatSystemMessages({
      requestMode: 'protected',
      requestStatus: 'accepted',
      bookingStatus: 'completed',
      depositStatus: 'released',
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