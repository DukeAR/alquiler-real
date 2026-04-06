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

    expect(screen.getByRole('heading', { name: 'Sabé qué estás viendo antes de reservar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lo importante para revisar antes de reservar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué puede aparecer como verificado' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Anfitriones' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Publicá para que te entiendan antes del chat' })).toBeInTheDocument();
    });
    expect(screen.getByText('Publicá cuando el aviso se entienda solo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Huéspedes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Qué mirar antes de reservar' })).toBeInTheDocument();
    });
    expect(screen.getByText('Explorá sabiendo qué ya fue comprobado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
