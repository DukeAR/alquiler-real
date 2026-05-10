import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ExploreFiltersBar, type ExploreFilters } from '../explore/ExploreFiltersBar';

const baseFilters: ExploreFilters = {
  checkIn: '',
  checkOut: '',
  guests: '1',
  verifiedOnly: false,
};

describe('ExploreFiltersBar', () => {
  test('shows the real-verification filter and toggles verifiedOnly', () => {
    const onFiltersChange = vi.fn();

    render(
      <ExploreFiltersBar
        viewMode="grid"
        onViewModeChange={vi.fn()}
        filters={baseFilters}
        sortBy="verification"
        onSortChange={vi.fn()}
        onFiltersChange={onFiltersChange}
        hasActiveFilters={false}
        onClear={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /Solo verificados presencialmente/i });
    const controlsGrid = screen.getByTestId('explore-filters-controls');
    const verifiedTitle = screen.getByText('Solo propiedades verificadas presencialmente');
    const verifiedSubtitle = screen.getByText('Filtra solo avisos con visita real');
    const verifiedToggle = verifiedTitle.closest('label');

    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText('Ordenar por')).not.toBeInTheDocument();
    expect(screen.queryByText('Precio')).not.toBeInTheDocument();
    expect(screen.queryByText('Verificación')).not.toBeInTheDocument();
    expect(screen.getByText('Ingreso')).toBeInTheDocument();
    expect(screen.getByText('Salida')).toBeInTheDocument();
    expect(screen.getByText('Huéspedes')).toBeInTheDocument();
    expect(controlsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(17.5rem,1.15fr)]');
    expect(verifiedToggle).toHaveClass('min-h-[4.5rem]', 'rounded-[18px]', 'px-5', 'py-3');
    expect(verifiedTitle).toHaveClass('text-[0.84rem]', 'font-semibold', 'tracking-[-0.015em]');
    expect(verifiedSubtitle).toHaveClass('text-[0.72rem]', 'font-medium', 'tracking-[-0.01em]');
    expect(screen.getByRole('option', { name: 'Más verificadas primero' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Precio más bajo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Precio más alto' })).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...baseFilters,
      verifiedOnly: true,
    });
  });
});