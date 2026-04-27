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

    const eyebrow = screen.getByText('COSTA ATLÁNTICA ARGENTINA');
    const title = screen.getByRole('heading', { name: /La información real importa\.\s*Elegí mejor antes de reservar\./ });
    const subtitle = screen.getByText('Compará precio, zona y verificación antes de reservar.');
    const search = screen.getByRole('combobox', { name: 'Destino' });
    const badge = screen.getByText('Ubicación real');

    expect(eyebrow).toBeInTheDocument();
    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(title.compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(subtitle.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(search.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    expect(screen.queryByText('Costa Atlántica Argentina')).toBeNull();
    expect(screen.queryByText('Alquileres verificados en la Costa Atlántica Argentina')).toBeNull();
    expect(search).toHaveAttribute('placeholder', '¿A dónde querés ir?');
    expect(screen.queryByText('Buscador principal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Buscar alojamientos' })).toBeInTheDocument();
    expect(badge).toBeInTheDocument();
    expect(screen.getByText('Anfitrión visible')).toBeInTheDocument();
    expect(screen.getByText('Datos comprobados')).toBeInTheDocument();
  });
});