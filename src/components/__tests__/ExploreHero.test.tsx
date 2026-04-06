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

    expect(screen.getByRole('heading', { name: 'Elegir dónde quedarte debería ser simple.' })).toBeInTheDocument();
    expect(screen.getByText('No podemos elegir por vos, pero te damos claridad en todo el proceso para que decidas tranquilo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o ciudad')).toHaveAttribute('placeholder', 'Buscá una zona, ciudad o barrio');
    expect(screen.getByRole('button', { name: 'Ver alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Comparás rápido quién publica, dónde está el lugar y qué ya se pudo confirmar.')).toBeInTheDocument();
  });
});