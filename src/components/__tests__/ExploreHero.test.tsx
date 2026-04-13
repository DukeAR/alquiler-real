import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ExploreHero } from '../explore/ExploreHero';

describe('ExploreHero', () => {
  test('renders the focused hero with a direct subtitle and a solid search card', () => {
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
    expect(screen.getByText('Elegí mejor antes de reservar.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Destino' })).toHaveAttribute('placeholder', '¿A dónde querés ir?');
    expect(screen.queryByText('Buscador principal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Buscar alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación real')).toBeInTheDocument();
    expect(screen.getByText('Anfitrión visible')).toBeInTheDocument();
    expect(screen.getByText('Datos comprobados')).toBeInTheDocument();
  });
});