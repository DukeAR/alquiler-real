import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const chatWithAssistantMock = vi.fn();
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

vi.mock('../../services/geminiService', () => ({
  chatWithAssistant: (...args: unknown[]) => chatWithAssistantMock(...args),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <>{children}</>,
}));

import { AIAssistant } from '../AIAssistant';

describe('AIAssistant', () => {
  beforeEach(() => {
    chatWithAssistantMock.mockReset();
    consoleErrorMock.mockClear();
  });

  afterEach(() => {
    consoleErrorMock.mockClear();
  });

  test('shows a soft error and lets the user retry the last prompt', async () => {
    chatWithAssistantMock
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('Palermo y Colegiales suelen tener más oferta verificada.');

    render(<AIAssistant />);

    fireEvent.click(screen.getByRole('button', { name: /Abrir asistente de Alquiler Real/i }));
    fireEvent.change(screen.getByLabelText(/Consulta para el asistente/i), {
      target: { value: '¿Qué zona conviene para empezar a buscar?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    expect(await screen.findByText('No pudimos responder ahora.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reintentar última consulta/i }));

    await waitFor(() => {
      expect(chatWithAssistantMock).toHaveBeenCalledTimes(2);
    });

    expect(chatWithAssistantMock).toHaveBeenNthCalledWith(
      1,
      '¿Qué zona conviene para empezar a buscar?',
      [{ role: 'user', parts: [{ text: '¿Qué zona conviene para empezar a buscar?' }] }],
    );
    expect(chatWithAssistantMock).toHaveBeenNthCalledWith(
      2,
      '¿Qué zona conviene para empezar a buscar?',
      [{ role: 'user', parts: [{ text: '¿Qué zona conviene para empezar a buscar?' }] }],
    );
    expect(await screen.findByText('Palermo y Colegiales suelen tener más oferta verificada.')).toBeInTheDocument();
  });

  test('shows loading feedback while the assistant is preparing a response', async () => {
    let resolveChat: ((value: string) => void) | undefined;

    chatWithAssistantMock.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveChat = resolve;
        }),
    );

    render(<AIAssistant />);

    fireEvent.click(screen.getByRole('button', { name: /Abrir asistente de Alquiler Real/i }));
    fireEvent.change(screen.getByLabelText(/Consulta para el asistente/i), {
      target: { value: '¿Cómo valido mejor una reserva?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    expect(await screen.findByRole('button', { name: /Consultando.../i })).toBeDisabled();

    act(() => {
      resolveChat?.('Pedí identidad validada, acuerdo y datos trazables antes de transferir.');
    });

    await waitFor(() => {
      expect(screen.getByText('Pedí identidad validada, acuerdo y datos trazables antes de transferir.')).toBeInTheDocument();
    });
  });
});