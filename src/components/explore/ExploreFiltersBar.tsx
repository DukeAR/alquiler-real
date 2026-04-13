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
    <section className="mx-auto max-w-[48rem]">
      <Card padding="none" className="border-slate-200/80 bg-white/96 p-3.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)] sm:p-4">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid w-full max-w-[18rem] grid-cols-2 items-center rounded-full border border-slate-200/85 bg-slate-100/85 p-1">
              {(['grid', 'map'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => onViewModeChange(mode)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,box-shadow] duration-150',
                    viewMode === mode
                      ? 'bg-white text-slate-950 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22)]'
                      : 'text-slate-600 hover:text-slate-900',
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
                className="self-start rounded-full px-4 md:self-auto"
              >
                <Icons.X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)_minmax(0,1.1fr)] xl:items-stretch">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ordenar por
              </span>
              <select
                aria-label="Ordenar por"
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as ExploreSort)}
                className="app-control h-[3.15rem] min-w-0 rounded-[var(--app-radius-control)] border-[color:var(--app-surface-border)] bg-white px-4 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-900 shadow-none"
              >
                <option value="verification">Más información comprobada</option>
                <option value="rating">Mejor calificación</option>
                <option value="price">Precio más bajo</option>
              </select>
            </label>

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Precios
              </span>
              <div className="grid min-w-0 grid-cols-2 gap-2.5">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={filters.minPrice}
                  onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
                  placeholder="Desde"
                  icon={<span className="text-xs font-medium">$</span>}
                  className="h-[3.15rem] min-w-0 rounded-[var(--app-radius-control)] border-[color:var(--app-surface-border)] bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none placeholder:text-slate-500"
                />

                <Input
                  type="number"
                  inputMode="numeric"
                  value={filters.maxPrice}
                  onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
                  placeholder="Hasta"
                  icon={<span className="text-xs font-medium">$</span>}
                  className="h-[3.15rem] min-w-0 rounded-[var(--app-radius-control)] border-[color:var(--app-surface-border)] bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <label className={cn(
              'flex min-h-[3.15rem] min-w-0 items-center gap-3 rounded-[var(--app-radius-control)] border px-3.5 py-3 text-left transition-[border-color,background-color] duration-150',
              filters.verifiedOnly
                ? 'border-brand/20 bg-brand/5'
                : 'border-[color:var(--app-surface-border)] bg-white',
            )}>
              <span className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand',
                filters.verifiedOnly ? 'bg-brand/12' : 'bg-brand/8',
              )}>
                <Icons.ShieldCheck className="h-4.5 w-4.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-5 text-slate-900">
                  Solo avisos con respaldo real
                </span>
                <span className="block text-[11.5px] leading-4 text-slate-500">
                  3 o más comprobaciones visibles
                </span>
              </span>

              <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                <input
                  type="checkbox"
                  aria-label="Solo avisos con respaldo real"
                  checked={filters.verifiedOnly}
                  onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-300 shadow-[inset_0_1px_2px_rgba(15,23,42,0.18)] transition-colors duration-150 peer-checked:bg-brand" />
                <span className="absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-[0_8px_16px_rgba(15,23,42,0.18)] transition-transform duration-150 peer-checked:translate-x-5" />
              </span>
            </label>
          </div>
        </div>
      </Card>
    </section>
  );
};

export default ExploreFiltersBar;