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
      <Card padding="none" className="app-surface border-slate-200/85 bg-white/94 p-3 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full grid-cols-2 items-center rounded-[18px] border border-slate-200/80 bg-slate-100/80 p-1 xl:w-fit">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,box-shadow,transform] duration-150 sm:px-3.5',
                  viewMode === mode ? 'bg-white text-slate-900 shadow-[0_14px_24px_-18px_rgba(15,23,42,0.18)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-700',
                )}
              >
                {mode === 'grid' ? <Icons.LayoutGrid className="h-4 w-4" /> : <Icons.Map className="h-4 w-4" />}
                {mode === 'grid' ? 'Alojamientos' : 'Mapa'}
              </button>
            ))}
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
            <label className="flex min-w-0 w-full flex-col gap-1 sm:min-w-[188px] sm:w-auto xl:w-auto">
              <span className="pl-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ordenar por
              </span>
              <select
                aria-label="Ordenar por"
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as ExploreSort)}
                className="app-control h-11 min-w-0 w-full rounded-[14px] bg-white px-4 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-700 outline-none shadow-none sm:min-w-[170px]"
              >
                <option value="verification">Más respaldo</option>
                <option value="rating">Mejor calificados</option>
                <option value="price">Precio dentro del respaldo</option>
              </select>
            </label>

            <label className="flex min-h-11 min-w-0 w-full items-center gap-3 rounded-[16px] border border-slate-200/80 bg-white px-3.5 py-2.5 text-left shadow-none transition-colors duration-150 hover:border-slate-300/90 sm:col-span-2 xl:min-w-[250px] xl:w-auto">
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors duration-150 peer-checked:bg-emerald-500/90" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.16)] transition-transform duration-150 peer-checked:translate-x-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-slate-800">
                  <span className="sm:hidden">Solo avisos verificados</span>
                  <span className="hidden sm:inline">Solo con verificaciones reales</span>
                </span>
                <span className="block text-[11.5px] leading-4 text-slate-500">
                  <span className="sm:hidden">3+ comprobaciones</span>
                  <span className="hidden sm:inline">3 o más comprobaciones concretas</span>
                </span>
              </span>
            </label>

            <div className="grid min-w-0 grid-cols-2 gap-2 sm:w-full sm:col-span-2 xl:flex xl:w-auto xl:items-center">
              <Input
                type="number"
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
                placeholder="Desde"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-11 min-w-0 w-full rounded-[14px] border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none xl:w-28"
              />

              <Input
                type="number"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
                placeholder="Hasta"
                icon={<span className="text-xs font-medium">$</span>}
                className="h-11 min-w-0 w-full rounded-[14px] border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none xl:w-28"
              />
            </div>

            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="w-full rounded-[14px] px-3.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:col-span-2 sm:w-auto xl:w-auto"
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