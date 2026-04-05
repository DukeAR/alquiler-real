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

    expect(screen.getByRole('heading', { name: 'Elegí con información real antes de reservar' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación verificada, identidad confirmada y reseñas reales.')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o ciudad')).toHaveAttribute('placeholder', 'Buscá una zona o ciudad');
    expect(screen.getByRole('button', { name: 'Ver alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('No decidimos por vos. Te damos todo para que elijas tranquilo y disfrutes el viaje.')).toBeInTheDocument();
  });
});