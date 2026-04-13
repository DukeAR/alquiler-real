import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const loginMock = vi.fn();
const clearErrorMock = vi.fn();
let authError: string | null = null;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
    error: authError,
    clearError: clearErrorMock,
  }),
}));

import { LoginPanel } from '../LoginPanel';

describe('LoginPanel', () => {
  beforeEach(() => {
    loginMock.mockReset();
    clearErrorMock.mockReset();
    authError = null;
  });

  test('renders auth failures as a shared notice banner', () => {
    authError = 'La contraseña no coincide con esta cuenta.';

    render(
      <MemoryRouter>
        <LoginPanel />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Revisá los datos e intentá de nuevo.');
    expect(screen.getByRole('alert')).toHaveTextContent('La contraseña no coincide con esta cuenta.');
  });

  test('shows loading feedback while login is pending', async () => {
    let resolveLogin: ((value: boolean) => void) | undefined;

    loginMock.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveLogin = resolve;
        }),
    );

    render(
      <MemoryRouter>
        <LoginPanel />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@test.com' } });
  fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ingresá$/i }));

    expect(await screen.findByRole('button', { name: /Ingresando.../i })).toBeDisabled();
    expect(loginMock).toHaveBeenCalledWith('ana@test.com', '123456');

    act(() => {
      resolveLogin?.(true);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Ingresá$/i })).toBeInTheDocument();
    });
  });
});