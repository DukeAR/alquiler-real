import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

export type ExploreSort = 'recommended' | 'rating' | 'price-asc';

export type ExploreFilters = {
  minPrice: string;
  maxPrice: string;
  guests: string;
  type: string;
  verifiedOnly: boolean;
};

type ExploreFiltersBarProps = {
  viewMode: 'grid' | 'map';
  onViewModeChange: (mode: 'grid' | 'map') => void;
  filters: ExploreFilters;
  sortBy: ExploreSort;
  onSortChange: (next: ExploreSort) => void;
  onFiltersChange: (next: ExploreFilters) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
};

export const ExploreFiltersBar = ({
  viewMode,
  onViewModeChange,
  filters,
  sortBy,
  onSortChange,
  onFiltersChange,
  hasActiveFilters,
  onClear,
}: ExploreFiltersBarProps) => {
  return (
    <section className="sticky top-20 z-40">
      <Card padding="none" className="app-surface border-slate-200/85 bg-white/94 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-fit items-center rounded-2xl bg-slate-100 p-1">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all',
                  viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {mode === 'grid' ? <Icons.LayoutGrid className="h-4 w-4" /> : <Icons.Map className="h-4 w-4" />}
                {mode === 'grid' ? 'Alojamientos' : 'Mapa'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as ExploreSort)}
              className="h-10 min-w-[158px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="recommended">Mejor opción</option>
              <option value="rating">Mejor rating</option>
              <option value="price-asc">Menor precio</option>
            </select>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
                placeholder="Desde"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-10 w-24 rounded-xl border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium shadow-none"
              />

              <Input
                type="number"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
                placeholder="Hasta"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-10 w-24 rounded-xl border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium shadow-none"
              />
            </div>

            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="rounded-xl px-3 text-sm text-brand hover:bg-brand/5 hover:text-brand"
              >
                <Icons.X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </section>
  );
};

export default ExploreFiltersBar;