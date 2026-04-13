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
  test('shows the more-information filter and toggles verifiedOnly', () => {
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

    const checkbox = screen.getByRole('checkbox', { name: /Solo con 3\+ comprobaciones/i });

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Ubicación, anfitrión o datos validados')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Más información comprobada' })).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...baseFilters,
      verifiedOnly: true,
    });
  });
});