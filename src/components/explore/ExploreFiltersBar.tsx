import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import type { PropertyCatalogSort } from '../../lib/propertyVerification';

export type ExploreSort = PropertyCatalogSort;

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
  const sharedControlClassName = 'explore-filter-control h-11 min-w-0 text-[0.93rem] font-semibold tracking-[-0.015em] text-slate-950';

  return (
    <section className="rounded-[calc(var(--app-radius-card)+4px)] border border-slate-200 bg-white px-4 py-3 shadow-[0_24px_48px_-40px_rgba(15,23,42,0.18)] sm:px-5 sm:py-3.5 lg:px-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:relative sm:min-h-[2.5rem] sm:items-center sm:justify-center">
          <div className="inline-flex h-10 w-fit items-center gap-1 self-center rounded-[1rem] border border-slate-200 bg-slate-100/90 p-1">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex h-full items-center justify-center gap-2 rounded-[0.82rem] px-4.5 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.08em] transition-[background-color,color,box-shadow] duration-150',
                  viewMode === mode
                    ? 'bg-white text-slate-950 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.22)]'
                    : 'text-slate-700 hover:text-slate-950',
                )}
              >
                {mode === 'grid' ? <Icons.LayoutGrid className="h-4 w-4" /> : <Icons.Map className="h-4 w-4" />}
                {mode === 'grid' ? 'Alojamientos' : 'Mapa'}
              </button>
            ))}
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              onClick={onClear}
              variant="ghost"
              size="sm"
              className="h-9 self-end rounded-[0.85rem] px-3 text-[0.8rem] text-slate-700 sm:absolute sm:right-0 sm:top-1/2 sm:h-10 sm:-translate-y-1/2 sm:px-3.5 sm:text-[0.84rem] sm:text-slate-900"
            >
              <Icons.X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:gap-4 lg:flex-nowrap lg:gap-5 xl:gap-6">
          <div className="min-w-0 md:w-[17rem] md:flex-none lg:w-[18rem]">
            <select
              aria-label="Ordenar por"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as ExploreSort)}
              className={cn('app-control px-4', sharedControlClassName)}
            >
              <option value="verification">Más verificados primero</option>
              <option value="rating">Mejor calificación</option>
              <option value="price">Precio más bajo</option>
            </select>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2.5 md:w-[18rem] md:flex-none lg:w-[20rem] xl:w-[22rem]">
            <Input
              type="number"
              inputMode="numeric"
              aria-label="Precio desde"
              value={filters.minPrice}
              onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
              placeholder="Desde"
              icon={<span className="text-sm font-semibold text-[#64748b]">$</span>}
              className={cn(sharedControlClassName, 'py-0 pl-10 pr-4 placeholder:font-semibold placeholder:text-slate-700 placeholder:opacity-100')}
            />

            <Input
              type="number"
              inputMode="numeric"
              aria-label="Precio hasta"
              value={filters.maxPrice}
              onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
              placeholder="Hasta"
              icon={<span className="text-sm font-semibold text-[#64748b]">$</span>}
              className={cn(sharedControlClassName, 'py-0 pl-10 pr-4 placeholder:font-semibold placeholder:text-slate-700 placeholder:opacity-100')}
            />
          </div>

          <label className={cn(
            'flex h-11 min-w-0 items-center gap-3 rounded-[0.95rem] border px-4 text-left transition-[border-color,background-color,box-shadow] duration-150 md:ml-auto md:min-w-[21rem] lg:min-w-[23rem] xl:min-w-[24rem]',
            filters.verifiedOnly
              ? 'border-brand/30 bg-brand/[0.04] shadow-[0_10px_20px_-22px_rgba(67,56,202,0.24)]'
              : 'border-slate-300/90 bg-white shadow-[0_10px_20px_-24px_rgba(15,23,42,0.16)]',
          )}>
            <span className="min-w-0 flex-1 truncate pr-1 text-[0.85rem] font-semibold tracking-[-0.015em] text-slate-950">
              <span className="block truncate">
                Solo verificados presencialmente
              </span>
              <span className="sr-only">
                Mostrando solo avisos con verificación completa
              </span>
            </span>

            <span className="relative ml-auto inline-flex h-6 w-11 shrink-0 items-center">
              <input
                type="checkbox"
                aria-label="Solo verificados presencialmente"
                checked={filters.verifiedOnly}
                onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors duration-150 peer-checked:bg-brand" />
              <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_4px_rgba(15,23,42,0.12)] transition-transform duration-150 peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </div>
    </section>
  );
};

export default ExploreFiltersBar;