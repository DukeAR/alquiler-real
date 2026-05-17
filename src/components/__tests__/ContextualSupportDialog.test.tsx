import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const apiJsonMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

import { ContextualSupportDialog } from '../ContextualSupportDialog';

describe('ContextualSupportDialog', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
  });

  test('loads the support timeline and submits a contextual help request', async () => {
    apiJsonMock
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        case: {
          id: 'support_1',
          entryPoint: 'publishing',
          category: 'listing_error',
          description: 'La foto principal no coincide con lo que quise subir.',
          status: 'received',
          statusNote: null,
          propertyId: null,
          bookingId: null,
          conversationId: null,
          reviewType: null,
          contextSnapshot: {
            entryPoint: 'publishing',
          },
          createdAt: '2026-05-10T12:00:00.000Z',
          updatedAt: '2026-05-10T12:00:00.000Z',
          lastStatusAt: '2026-05-10T12:00:00.000Z',
        },
        message: 'Recibimos tu pedido de ayuda.',
      });

    render(
      <ContextualSupportDialog
        entryPoint="publishing"
        propertyTitle="PH con patio"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Necesito ayuda/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/support/cases?entryPoint=publishing');
    });

    expect(screen.getByText('Vamos a revisar la información disponible dentro de esta operación.')).toBeInTheDocument();
    expect(screen.getByText(/^Recibido$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Esperando respuesta$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Error en publicacion/i }));
    fireEvent.change(screen.getByLabelText(/Aclaracion breve opcional/i), {
      target: { value: 'La foto principal no coincide con lo que quise subir.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar pedido/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenLastCalledWith('/api/support/cases', {
        method: 'POST',
        body: JSON.stringify({
          entryPoint: 'publishing',
          category: 'listing_error',
          description: 'La foto principal no coincide con lo que quise subir.',
        }),
      });
    });

    expect(showToastMock).toHaveBeenCalledWith('Ayuda contextual', 'Recibimos tu pedido de ayuda.', 'success');
    expect(screen.getByText(/La foto principal no coincide con lo que quise subir./i)).toBeInTheDocument();
  });
});