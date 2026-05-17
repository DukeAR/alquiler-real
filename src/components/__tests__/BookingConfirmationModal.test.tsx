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
    expect(screen.getByText('Modalidad lista para elegir')).toBeInTheDocument();
    expect(screen.getAllByText('Casa frente al mar').length).toBeGreaterThan(0);
    expect(screen.getByText('Laura')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Elegí cómo querés avanzar', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Coordinar directamente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /usar seña protegida/i })).toBeInTheDocument();
    expect(screen.getByText('Si elegís Seña Protegida, la seña queda retenida hasta check-in. La Seña Protegida cubre casos relacionados con inexistencia del inmueble o imposibilidad de acceso.')).toBeInTheDocument();
    expect(screen.getByText('La Seña Protegida cubre casos relacionados con inexistencia del inmueble o imposibilidad de acceso.')).toBeInTheDocument();
    expect(screen.getByText('Si hace falta revisar un caso, vamos a usar la información registrada dentro de esta operación.')).toBeInTheDocument();
    expect(screen.getByText('Ver alcance y revisión manual')).toBeInTheDocument();
    expect(screen.getByText(/La información del aviso la carga el anfitrión/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /usar seña protegida/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /coordinar por chat/i }));
    expect(onStartDirect).toHaveBeenCalledTimes(1);
  });
});