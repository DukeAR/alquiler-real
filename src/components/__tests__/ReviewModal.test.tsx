import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/apiConfig';
import { ReviewModal } from '../ReviewModal';

const selectCategoryScore = (label: string, score: string) => {
  const heading = screen.getByText(label);
  const categoryBlock = heading.closest('div')?.parentElement;

  if (!(categoryBlock instanceof HTMLElement)) {
    throw new Error(`No se encontró el bloque para la categoría ${label}`);
  }

  fireEvent.click(within(categoryBlock).getByRole('button', { name: score }));
};

describe('ReviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'review-1' }),
    });
  });

  test('requires every category score before sending the review', async () => {
    render(
      <ReviewModal
        bookingId="booking-1"
        reviewedUserId="host-1"
        reviewedUserName="Mariana"
        type="guest_review"
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cierre' }));

    expect(await screen.findByText('Puntuá cada categoría antes de guardar la reseña.')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('submits the canonical guest review payload with category scores', async () => {
    const onComplete = vi.fn();

    render(
      <ReviewModal
        bookingId="booking-1"
        reviewedUserId="host-1"
        reviewedUserName="Mariana"
        type="guest_review"
        onClose={vi.fn()}
        onComplete={onComplete}
      />,
    );

    selectCategoryScore('Comunicación', '5');
    selectCategoryScore('Claridad del aviso', '5');
    selectCategoryScore('Cumplimiento de lo acordado', '5');
    selectCategoryScore('Experiencia general', '5');

    fireEvent.change(screen.getByPlaceholderText('Si querés, dejá contexto breve para complementar la reseña...'), {
      target: { value: 'La coordinación fue clara y todo coincidió con lo publicado.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cierre' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    const reviewCall = (apiFetch as any).mock.calls.find(([url]: [string]) => url === '/api/reviews');
    expect(reviewCall).toBeTruthy();

    const [, requestInit] = reviewCall;
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(requestInit.body)).toEqual({
      booking_id: 'booking-1',
      reviewed_user_id: 'host-1',
      comment: 'La coordinación fue clara y todo coincidió con lo publicado.',
      type: 'guest_review',
      categories: [
        { key: 'communication', label: 'Comunicación', score: 5 },
        { key: 'listing_clarity', label: 'Claridad del aviso', score: 5 },
        { key: 'agreement_fulfillment', label: 'Cumplimiento de lo acordado', score: 5 },
        { key: 'overall_experience', label: 'Experiencia general', score: 5 },
      ],
    });
  });
});