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
  return (
    <section className="rounded-[var(--app-radius-card)] border border-slate-200/85 bg-white/96 px-3.5 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.16)] sm:px-4 sm:py-4 lg:px-5 lg:py-4.5">
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
          <span aria-hidden="true" className="block h-px" />

          <div className="inline-flex h-10 w-fit items-center gap-1 justify-self-center rounded-[0.95rem] border border-slate-200/80 bg-slate-100/85 p-1">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex h-full items-center justify-center gap-2 rounded-[0.78rem] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition-[background-color,color] duration-150',
                  viewMode === mode
                    ? 'bg-white text-slate-950 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22)]'
                    : 'text-slate-700 hover:text-slate-950',
                )}
              >
                {mode === 'grid' ? <Icons.LayoutGrid className="h-4 w-4" /> : <Icons.Map className="h-4 w-4" />}
                {mode === 'grid' ? 'Alojamientos' : 'Mapa'}
              </button>
            ))}
          </div>

          <div className="justify-self-end">
            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="h-10 rounded-[0.9rem] px-3.5 text-[0.84rem] text-slate-900"
              >
                <Icons.X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.76fr)_minmax(0,0.76fr)_minmax(0,1.38fr)] sm:items-center">
          <div className="min-w-0">
            <select
              aria-label="Ordenar por"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as ExploreSort)}
              className="app-control h-12 min-w-0 rounded-[var(--app-radius-control)] border-[color:var(--app-surface-border)] bg-white px-4 text-[0.92rem] font-semibold tracking-[-0.01em] text-slate-950 shadow-none"
            >
              <option value="verification">Más verificados primero</option>
              <option value="rating">Mejor calificación</option>
              <option value="price">Precio más bajo</option>
            </select>
          </div>

          <Input
            type="number"
            inputMode="numeric"
            aria-label="Precio desde"
            value={filters.minPrice}
            onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
            placeholder="Desde"
            icon={<span className="text-xs font-medium">$</span>}
            className="h-12 min-w-0 rounded-[var(--app-radius-control)] border-[color:var(--app-surface-border)] bg-white py-0 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-950 shadow-none placeholder:text-slate-500"
          />

          <Input
            type="number"
            inputMode="numeric"
            aria-label="Precio hasta"
            value={filters.maxPrice}
            onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
            placeholder="Hasta"
            icon={<span className="text-xs font-medium">$</span>}
            className="h-12 min-w-0 rounded-[var(--app-radius-control)] border-[color:var(--app-surface-border)] bg-white py-0 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-950 shadow-none placeholder:text-slate-500"
          />

          <label className={cn(
            'flex h-12 min-w-0 items-center gap-2.5 rounded-[var(--app-radius-control)] border px-3 py-2 text-left transition-[border-color,background-color,box-shadow] duration-150',
            filters.verifiedOnly
                    ? 'border-brand/25 bg-white shadow-[0_10px_24px_-22px_rgba(67,56,202,0.32)]'
                    : 'border-[color:var(--app-surface-border)] bg-white',
          )}>
            <Icons.ShieldCheck className={cn('h-4 w-4 shrink-0', filters.verifiedOnly ? 'text-brand' : 'text-slate-400')} />

            <span className="min-w-0 flex-1 pr-2">
              <span className="block overflow-hidden text-[11px] font-semibold leading-[1.05rem] text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                Solo avisos con respaldo real
              </span>
              <span className="hidden text-[10.5px] leading-[1rem] text-slate-600 lg:block">
                3 o más comprobaciones reales
              </span>
            </span>

            <span className="relative ml-auto inline-flex h-6 w-11 shrink-0 items-center">
              <input
                type="checkbox"
                aria-label="Solo avisos con respaldo real"
                checked={filters.verifiedOnly}
                onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors duration-150 peer-checked:bg-brand" />
              <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-150 peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </div>
    </section>
  );
};

export default ExploreFiltersBar;