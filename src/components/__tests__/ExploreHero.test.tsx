import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ExploreHero } from '../explore/ExploreHero';

describe('ExploreHero', () => {
  test('renders the simplified hero and search block copy', () => {
    render(
      <ExploreHero
        searchValue=""
        locationSuggestions={[]}
        onSearchChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        onSearchSubmitValue={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Reservar es fácil. Decidir bien no siempre.' })).toBeInTheDocument();
    expect(screen.getByText('Información real para decidir mejor.')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o ciudad')).toHaveAttribute('placeholder', '¿A dónde querés ir?');
    expect(screen.getByText('Elegí con información real desde el primer vistazo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación verificada')).toBeInTheDocument();
    expect(screen.getByText('Anfitrión identificado')).toBeInTheDocument();
    expect(screen.getByText('Datos comprobados')).toBeInTheDocument();
  });
});