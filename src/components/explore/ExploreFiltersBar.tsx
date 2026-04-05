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
    <section className="z-40 lg:sticky lg:top-24">
      <Card padding="none" className="app-surface border-slate-200/85 bg-white/94 p-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)] backdrop-blur-xl md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-fit items-center rounded-[18px] border border-slate-200/80 bg-slate-100/80 p-1">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex items-center gap-2 rounded-[14px] px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,box-shadow,transform] duration-150',
                  viewMode === mode ? 'bg-white text-slate-900 shadow-[0_14px_24px_-18px_rgba(15,23,42,0.18)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-700',
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
              className="app-control h-11 min-w-[170px] rounded-[14px] bg-white px-4 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-700 outline-none shadow-none"
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
                className="h-11 w-28 rounded-[14px] border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none"
              />

              <Input
                type="number"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
                placeholder="Hasta"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-11 w-28 rounded-[14px] border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none"
              />
            </div>

            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="rounded-[14px] px-3.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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