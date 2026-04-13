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
      <Card padding="none" className="app-surface border-slate-200/90 bg-white/98 p-5 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.18)] sm:p-6 md:p-7">
        <div className="flex flex-col gap-6 md:gap-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-1.5">
              <p className="app-eyebrow text-slate-500">Exploración</p>
              <p className="text-sm leading-6 text-slate-600">
                Ordená resultados y afiná la búsqueda sin perder contexto del listado.
              </p>
            </div>

            <div className="grid w-full max-w-[19.5rem] grid-cols-2 items-center rounded-[var(--app-radius-control)] border border-slate-300/90 bg-slate-100/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--app-radius-control)-6px)] px-3.5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,box-shadow,transform,border-color] duration-150 sm:px-4',
                  viewMode === mode
                    ? 'bg-brand text-white shadow-[0_18px_34px_-24px_rgba(67,56,202,0.42)]'
                    : 'text-slate-600 hover:bg-white/85 hover:text-slate-800',
                )}
              >
                {mode === 'grid' ? <Icons.LayoutGrid className="h-4 w-4" /> : <Icons.Map className="h-4 w-4" />}
                {mode === 'grid' ? 'Alojamientos' : 'Mapa'}
              </button>
            ))}
            </div>
          </div>

          <div className="grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.1fr)_auto] xl:items-stretch">
            <div className="rounded-[var(--app-radius-control)] border border-slate-200/90 bg-slate-50/78 p-3.5 md:p-4">
              <label className="flex min-w-0 flex-col gap-2">
                <span className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Ordenar resultados
                </span>
                <select
                  aria-label="Ordenar por"
                  value={sortBy}
                  onChange={(event) => onSortChange(event.target.value as ExploreSort)}
                  className="app-control h-12 min-w-0 rounded-[var(--app-radius-control)] border-slate-300/90 bg-white px-4 text-[0.94rem] font-semibold tracking-[-0.01em] text-slate-700 outline-none shadow-[0_8px_24px_-22px_rgba(15,23,42,0.16)]"
                >
                  <option value="verification">Más información comprobada</option>
                  <option value="rating">Mejor calificación</option>
                  <option value="price">Precio más bajo</option>
                </select>
              </label>
            </div>

            <div className="rounded-[var(--app-radius-control)] border border-slate-200/90 bg-slate-50/78 p-3.5 md:p-4">
              <div className="flex min-w-0 flex-col gap-2">
                <span className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Precio por noche
                </span>
                <div className="grid min-w-0 grid-cols-2 gap-2.5">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={filters.minPrice}
                    onChange={(event) => onFiltersChange({ ...filters, minPrice: event.target.value })}
                    placeholder="Desde"
                    icon={<span className="text-xs font-medium">$</span>}
                    className="h-12 min-w-0 rounded-[var(--app-radius-control)] border-slate-300/90 bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-[0_8px_24px_-22px_rgba(15,23,42,0.16)] placeholder:text-slate-500"
                  />

                  <Input
                    type="number"
                    inputMode="numeric"
                    value={filters.maxPrice}
                    onChange={(event) => onFiltersChange({ ...filters, maxPrice: event.target.value })}
                    placeholder="Hasta"
                    icon={<span className="text-xs font-medium">$</span>}
                    className="h-12 min-w-0 rounded-[var(--app-radius-control)] border-slate-300/90 bg-white py-2.5 pl-9 pr-3 text-[0.94rem] font-semibold tracking-[-0.01em] shadow-[0_8px_24px_-22px_rgba(15,23,42,0.16)] placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <label className="flex min-h-[5.5rem] min-w-0 items-center gap-3.5 rounded-[var(--app-radius-control)] border border-slate-200/90 bg-slate-50/78 px-4 py-3.5 text-left transition-colors duration-150 hover:border-slate-300/90">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icons.ShieldCheck className="h-4.5 w-4.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-5 text-slate-800">
                  Solo con 3+ comprobaciones
                </span>
                <span className="block text-[11.5px] leading-4 text-slate-500">
                  Ubicación, anfitrión o datos validados
                </span>
              </span>

              <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                <input
                  type="checkbox"
                  aria-label="Solo con 3+ comprobaciones"
                  checked={filters.verifiedOnly}
                  onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors duration-150 peer-checked:bg-brand" />
                <span className="absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-[0_6px_12px_rgba(15,23,42,0.16)] transition-transform duration-150 peer-checked:translate-x-5" />
              </span>
            </label>

            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="h-full min-h-[5.5rem] w-full rounded-[var(--app-radius-control)] border border-slate-200/90 bg-white px-4 text-sm text-slate-600 shadow-[0_10px_26px_-22px_rgba(15,23,42,0.16)] hover:bg-slate-50 hover:text-slate-900 xl:w-auto xl:min-w-[10.5rem] xl:justify-self-end"
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