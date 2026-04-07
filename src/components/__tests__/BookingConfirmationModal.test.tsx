import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import BookingConfirmationModal from '../BookingConfirmationModal';

describe('BookingConfirmationModal', () => {
  test('renders the request summary and lets the user choose the protected path', () => {
    const onClose = vi.fn();
    const onStartDirect = vi.fn();
    const onStartProtected = vi.fn();

    render(
      <BookingConfirmationModal
        isOpen
        onClose={onClose}
        onStartDirect={onStartDirect}
        onStartProtected={onStartProtected}
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
    expect(screen.getByText('Propuesta lista para enviar')).toBeInTheDocument();
    expect(screen.getAllByText('Casa frente al mar').length).toBeGreaterThan(0);
    expect(screen.getByText('Laura')).toBeInTheDocument();
    expect(screen.getByText('Elegí cómo querés avanzar con esta estadía')).toBeInTheDocument();
    expect(screen.getByText('Acuerdo directo')).toBeInTheDocument();
    expect(screen.getByText('Reserva protegida')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud protegida/i }));
    expect(onStartProtected).toHaveBeenCalledTimes(1);
    expect(onStartDirect).not.toHaveBeenCalled();
  });

  test('supports closing with escape and the secondary action', async () => {
    const onClose = vi.fn();
    const onStartDirect = vi.fn();

    render(
      <BookingConfirmationModal
        isOpen
        onClose={onClose}
        onStartDirect={onStartDirect}
        onStartProtected={vi.fn()}
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

    fireEvent.click(screen.getByRole('button', { name: /enviar propuesta por chat/i }));
    expect(onStartDirect).toHaveBeenCalledTimes(1);
  });
});