import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ExploreFiltersBar, type ExploreFilters } from '../explore/ExploreFiltersBar';

const baseFilters: ExploreFilters = {
  minPrice: '',
  maxPrice: '',
  guests: '1',
  type: '',
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

    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText('Ordenar por')).not.toBeInTheDocument();
    expect(screen.queryByText('Precio')).not.toBeInTheDocument();
    expect(screen.queryByText('Verificación')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando solo avisos con verificación completa')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Más verificados primero' })).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...baseFilters,
      verifiedOnly: true,
    });
  });
});