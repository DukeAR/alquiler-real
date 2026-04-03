import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import BookingConfirmationModal from '../BookingConfirmationModal';
import { formatBookingDateTime, getCancellationDeadlineFromStartDate } from '../../lib/bookingDates';

describe('BookingConfirmationModal', () => {
  test('renders the refreshed reservation summary and confirms the booking', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const cancellationDeadlineLabel = formatBookingDateTime(getCancellationDeadlineFromStartDate('2026-04-10'));

    render(
      <BookingConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        propertyTitle="Casa frente al mar"
        hostName="Laura"
        checkIn="2026-04-10"
        checkOut="2026-04-13"
        nights={3}
        adults={2}
        children={1}
        nightly={120000}
        total={360000}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Estadía lista para confirmar')).toBeInTheDocument();
    expect(screen.getAllByText('Casa frente al mar').length).toBeGreaterThan(0);
    expect(screen.getByText('Laura')).toBeInTheDocument();
    expect(screen.getByText('Vas a ver todos los detalles antes de finalizar.')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`hasta el ${cancellationDeadlineLabel}`))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirmar estadía/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('supports closing with escape and the secondary action', async () => {
    const onClose = vi.fn();

    render(
      <BookingConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        propertyTitle="Casa frente al mar"
        hostName="Laura"
        checkIn="2026-04-10"
        checkOut="2026-04-13"
        nights={3}
        adults={2}
        children={0}
        nightly={120000}
        total={360000}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveClass('opacity-100');
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /seguir revisando/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});