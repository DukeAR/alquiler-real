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
    expect(screen.getByText('Por eso mostramos ubicación, quién publica y qué parte del aviso ya está comprobada antes de que mandes un mensaje o pagues. La idea es que sepas con quién tratás y qué ya quedó claro desde el inicio.')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o ciudad')).toHaveAttribute('placeholder', '¿A dónde querés ir?');
    expect(screen.getByRole('button', { name: 'Ver alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Revisá ubicación, quién publica y qué ya fue comprobado antes de reservar.')).toBeInTheDocument();
  });
});