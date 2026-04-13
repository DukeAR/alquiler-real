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
    expect(screen.getByText('Elegí con información real antes de reservar. Mirá qué ya está comprobado antes de abrir una ficha.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Destino' })).toHaveAttribute('placeholder', '¿A dónde querés ir?');
    expect(screen.getByText('Ingresá una zona y empezá por avisos que ya muestran ubicación, anfitrión y datos comprobados.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar alojamientos' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación real')).toBeInTheDocument();
    expect(screen.getByText('Anfitrión visible')).toBeInTheDocument();
    expect(screen.getByText('Datos comprobados')).toBeInTheDocument();
  });
});