import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const loginMock = vi.fn();
const registerMock = vi.fn();
const clearErrorMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
    register: registerMock,
    error: null,
    clearError: clearErrorMock
  })
}));

import { Register } from '../Register';

describe('Register screen', () => {
  beforeEach(() => {
    loginMock.mockReset();
    registerMock.mockReset();
    clearErrorMock.mockReset();
  });

  test('renders login mode when requested', () => {
    render(
      <MemoryRouter>
        <Register mode="login" />
      </MemoryRouter>
    );

    expect(screen.getByText('Ingresá a tu cuenta')).toBeInTheDocument();
    expect(screen.queryByText('Nombre completo')).toBeNull();
    expect(screen.getByRole('button', { name: /^Ingresá$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver a explorar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Creá tu cuenta$/i })).toBeInTheDocument();
  });

  test('shows inline validation in login mode before submitting', () => {
    render(
      <MemoryRouter>
        <Register mode="login" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Ingresá$/i }));

    expect(screen.getByText('Ingresá el email con el que te registraste.')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu contraseña.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  test('renders register mode when requested', () => {
    render(
      <MemoryRouter>
        <Register mode="register" />
      </MemoryRouter>
    );

    expect(screen.getByText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByText('¿Ya tenés cuenta? Ingresá')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Creá tu cuenta$/i })).toBeInTheDocument();
  });
});