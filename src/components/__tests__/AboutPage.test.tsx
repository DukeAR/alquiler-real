import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { AboutPage } from '../AboutPage';

describe('AboutPage', () => {
  test('renders the clearer sections, lets users switch tabs, and keeps the back action', async () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <AboutPage onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Cómo funciona Alquiler Real' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Información real para tomar mejores decisiones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Niveles de verificación, sin vueltas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Anfitriones' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tu publicación transmite confianza más rápido' })).toBeInTheDocument();
    });
    expect(screen.getByText('Mostrá información real desde el arranque')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Huéspedes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Usá las señales para filtrar mejor' })).toBeInTheDocument();
    });
    expect(screen.getByText('Explorá con más contexto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
