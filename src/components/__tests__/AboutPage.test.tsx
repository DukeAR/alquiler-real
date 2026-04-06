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
    expect(screen.getByRole('heading', { name: 'Lo importante para decidir en una sola lectura' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué puede aparecer como verificado' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Anfitriones' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Publicá con información que se pueda verificar' })).toBeInTheDocument();
    });
    expect(screen.getByText('Dejá el aviso listo para decidir')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Huéspedes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Qué mirar antes de reservar' })).toBeInTheDocument();
    });
    expect(screen.getByText('Explorá con la información a la vista')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
