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

    expect(screen.getByRole('heading', { name: 'Reservar es fácil. Confiar, no tanto.' })).toBeInTheDocument();
    expect(screen.getByText('Por eso mostramos quién publica, dónde está el lugar y qué ya fue comprobado antes de que hables o pagues.')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o ciudad')).toHaveAttribute('placeholder', 'Buscá una zona, ciudad o barrio');
    expect(screen.getByRole('button', { name: 'Ver alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Antes de reservar, ves rápido quién publica, dónde está el lugar y qué ya fue comprobado.')).toBeInTheDocument();
  });
});