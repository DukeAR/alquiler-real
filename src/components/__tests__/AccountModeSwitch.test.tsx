import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AccountModeSwitch } from '../ui/AccountModeSwitch';

const useAuthMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

describe('AccountModeSwitch', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  test('uses a green active state and keeps the inactive option readable', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', activeMode: 'host' },
      setActiveMode: vi.fn(async () => true),
    });

    render(
      <MemoryRouter>
        <AccountModeSwitch compact />
      </MemoryRouter>,
    );

    const hostButton = screen.getByRole('button', { name: 'Anfitrión' });
    const guestButton = screen.getByRole('button', { name: 'Huésped' });

    expect(hostButton).toHaveAttribute('aria-pressed', 'true');
    expect(hostButton).toHaveClass('!bg-emerald-600');
    expect(hostButton).toHaveClass('!text-white');
    expect(guestButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('switches mode when the other option is clicked', async () => {
    const setActiveModeMock = vi.fn(async () => true);

    useAuthMock.mockReturnValue({
      user: { id: 'user-1', activeMode: 'host' },
      setActiveMode: setActiveModeMock,
    });

    render(
      <MemoryRouter>
        <AccountModeSwitch compact />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Huésped' }));

    await waitFor(() => {
      expect(setActiveModeMock).toHaveBeenCalledWith('guest');
    });
  });
});