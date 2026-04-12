import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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
    <section>
      <Card padding="none" className="app-surface border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.16)] sm:p-5 md:p-6">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-1.5">
              <p className="app-eyebrow text-slate-500">Exploración</p>
              <p className="text-sm leading-6 text-slate-600">
                Ordená resultados y afiná la búsqueda sin perder contexto del listado.
              </p>
            </div>

            <div className="grid w-full max-w-[18rem] grid-cols-2 items-center rounded-[var(--app-radius-control)] border border-slate-200 bg-slate-50 p-1">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--app-radius-control)-4px)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,box-shadow,transform] duration-150 sm:px-3.5',
                  viewMode === mode ? 'bg-white text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.16)]' : 'text-slate-500 hover:bg-white/80 hover:text-slate-700',
                )}
              >
                {mode === 'grid' ? <Icons.LayoutGrid className="h-4 w-4" /> : <Icons.Map className="h-4 w-4" />}
                {mode === 'grid' ? 'Alojamientos' : 'Mapa'}
              </button>
            ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1.35fr)_auto] xl:items-end">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ordenar por
              </span>
              <select
                aria-label="Ordenar por"
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as ExploreSort)}
                className="app-control h-12 min-w-0 rounded-[var(--app-radius-control)] border-slate-200 bg-slate-50/70 px-4 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-700 outline-none shadow-none"
              >
                <option value="verification">Más información comprobada</option>
                <option value="rating">Mejor calificación</option>
                <option value="price">Precio más bajo</option>
              </select>
            </label>

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <Input
                type="number"
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
                placeholder="Desde"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-12 min-w-0 rounded-[var(--app-radius-control)] border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none"
              />

              <Input
                type="number"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
                placeholder="Hasta"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-12 min-w-0 rounded-[var(--app-radius-control)] border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none"
              />
            </div>

            <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-[var(--app-radius-control)] border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-colors duration-150 hover:border-slate-300/90">
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  aria-label="Solo con más información comprobada"
                  checked={filters.verifiedOnly}
                  onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors duration-150 peer-checked:bg-emerald-500/90" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.16)] transition-transform duration-150 peer-checked:translate-x-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-slate-800">
                  Solo con más información comprobada
                </span>
                <span className="block text-[11.5px] leading-4 text-slate-500">
                  3 o más comprobaciones visibles
                </span>
              </span>
            </label>

            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="h-12 w-full rounded-[var(--app-radius-control)] px-4 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 xl:w-auto xl:justify-self-end"
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