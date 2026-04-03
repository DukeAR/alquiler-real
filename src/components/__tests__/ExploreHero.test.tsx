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

    expect(screen.getByRole('heading', { name: /Reservar es fácil\.?\s*Elegir bien no siempre\./i })).toBeInTheDocument();
    expect(screen.getByText('Elegí con información clara desde el inicio: ubicación, verificación y reseñas reales antes de decidir.')).toBeInTheDocument();
    expect(screen.getByLabelText('Destino')).toHaveAttribute('placeholder', '¿Dónde querés alojarte?');
    expect(screen.getByRole('button', { name: 'Ver opciones' })).toBeInTheDocument();
    expect(screen.getByText('Propiedades verificadas • reseñas reales • información clara antes de reservar')).toBeInTheDocument();
  });
});