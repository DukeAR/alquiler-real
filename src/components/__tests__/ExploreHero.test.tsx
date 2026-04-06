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

    expect(screen.getByRole('heading', { name: 'Sabé dónde te estás metiendo antes de reservar.' })).toBeInTheDocument();
    expect(screen.getByText('Revisá quién publica, dónde está el lugar y qué parte del aviso ya fue comprobada antes de hablar o pagar.')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o ciudad')).toHaveAttribute('placeholder', 'Buscá una zona, ciudad o barrio');
    expect(screen.getByRole('button', { name: 'Ver alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Antes de reservar, ves rápido quién publica, dónde está el lugar y qué ya fue comprobado.')).toBeInTheDocument();
  });
});