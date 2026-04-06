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
  });

  test('adds acceptance and payment guidance before the deposit step', () => {
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
      'protected-payment',
    ]);
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