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
  const sharedControlTypographyClassName = 'text-[0.98rem] font-semibold tracking-[-0.015em]';
  const sharedControlClassName = `explore-filter-control h-12 min-w-0 ${sharedControlTypographyClassName} text-slate-950`;

  return (
    <section className="relative overflow-hidden rounded-[calc(var(--app-radius-card)+10px)] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(246,249,252,0.94)_100%)] px-5 py-4 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.22)] ring-1 ring-[rgba(255,255,255,0.55)] backdrop-blur-[16px] sm:px-6 sm:py-4.5 lg:px-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_68%)]" />
      <div className="relative z-10 flex flex-col gap-3.5">
        <div className="flex flex-col gap-2.5 sm:relative sm:min-h-[2.75rem] sm:items-center sm:justify-center">
          <div className="inline-flex h-11 w-fit items-center gap-1 self-center rounded-[1.05rem] border border-white/90 bg-white/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_32px_-28px_rgba(15,23,42,0.22)]">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex h-full items-center justify-center gap-2 rounded-[0.9rem] px-5 py-2.5 text-[0.87rem] font-semibold uppercase tracking-[0.08em] transition-[background-color,color,box-shadow] duration-150',
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
              className="h-10 self-end rounded-[0.95rem] px-3.5 text-[0.84rem] text-slate-700 sm:absolute sm:right-0 sm:top-1/2 sm:h-10 sm:-translate-y-1/2 sm:px-3.5 sm:text-[0.86rem] sm:text-slate-900"
            >
              <Icons.X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-white/80 bg-white/70 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-3">
          <div
            data-testid="explore-filters-controls"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-[1.125rem] lg:grid-cols-4 lg:items-stretch xl:gap-5"
          >
            <div className="min-w-0">
            <select
              aria-label="Ordenar por"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as ExploreSort)}
              className={cn('app-control px-4', sharedControlClassName)}
            >
              <option value="verification">Más verificados primero</option>
              <option value="price">Precio más bajo</option>
              <option value="price-desc">Precio más alto</option>
            </select>
            </div>

            <div className="min-w-0">
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
            </div>

            <div className="min-w-0">
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
              'flex h-12 min-w-0 w-full items-center justify-between gap-2.5 rounded-[14px] border px-4.5 text-left shadow-[0_10px_24px_-26px_rgba(15,23,42,0.2)] transition-[border-color,background-color,box-shadow] duration-150',
              filters.verifiedOnly
                ? 'border-brand/18 bg-[linear-gradient(180deg,rgba(79,70,229,0.07)_0%,rgba(79,70,229,0.03)_100%)]'
                : 'border-[rgba(15,23,42,0.06)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]',
            )}>
              <span className="flex min-w-0 flex-1 flex-col justify-center pr-1.5">
                <span className="block text-[0.8rem] font-semibold tracking-[-0.015em] leading-[1.15] text-slate-900">
                  Solo propiedades verificadas presencialmente
                </span>
                <span className="mt-1 block text-[0.68rem] font-medium tracking-[-0.01em] leading-[1.1] text-slate-500">
                  Filtra solo avisos con visita real
                </span>
              </span>

              <span className="relative inline-flex h-6 w-11 shrink-0 items-center self-center">
                <input
                  type="checkbox"
                  aria-label="Solo verificados presencialmente"
                  checked={filters.verifiedOnly}
                  onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-200/90 transition-colors duration-150 peer-checked:bg-brand" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_4px_rgba(15,23,42,0.12)] transition-transform duration-150 peer-checked:translate-x-5" />
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreFiltersBar;