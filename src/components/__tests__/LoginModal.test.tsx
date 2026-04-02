import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const loginMock = vi.fn();
const clearErrorMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
    register: vi.fn(),
    error: null,
    clearError: clearErrorMock,
  }),
}));

import { LoginModal } from '../LoginModal';

describe('LoginModal', () => {
  beforeEach(() => {
    loginMock.mockReset();
    clearErrorMock.mockReset();
  });

  test('opens and closes the shared login panel through window events', () => {
    render(
      <MemoryRouter>
        <LoginModal />
      </MemoryRouter>
    );

    expect(screen.queryByRole('dialog', { name: /Acceso a tu cuenta/i })).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('open-login'));
    });

    expect(screen.getByRole('dialog', { name: /Acceso a tu cuenta/i })).toBeInTheDocument();
    expect(screen.getByText('Ingresá a tu cuenta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seguir explorando/i })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('close-login'));
    });

    expect(screen.queryByRole('dialog', { name: /Acceso a tu cuenta/i })).toBeNull();
  });
});