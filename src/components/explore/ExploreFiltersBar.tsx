import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import type { PropertyCatalogSort } from '../../lib/propertyVerification';

export type ExploreSort = PropertyCatalogSort;

export type ExploreFilters = {
  checkIn: string;
  checkOut: string;
  guests: string;
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const sharedControlTypographyClassName = 'text-[0.94rem] font-semibold tracking-[-0.015em] sm:text-[0.98rem]';
  const sharedControlClassName = `explore-filter-control h-12 min-w-0 ${sharedControlTypographyClassName} text-slate-950 sm:h-14`;

  const handleCheckInChange = (value: string) => {
    onFiltersChange({
      ...filters,
      checkIn: value,
      checkOut: !value || (filters.checkOut && filters.checkOut < value) ? '' : filters.checkOut,
    });
  };

  const handleCheckOutChange = (value: string) => {
    onFiltersChange({
      ...filters,
      checkOut: value,
    });
  };

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(246,249,252,0.94)_100%)] px-4 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.2)] ring-1 ring-[rgba(255,255,255,0.55)] backdrop-blur-[16px] sm:rounded-[calc(var(--app-radius-card)+10px)] sm:px-6 sm:py-5.5 lg:px-7 lg:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-1 h-24 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.16),transparent_72%)]" />
      <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col gap-3 sm:relative sm:min-h-[3.25rem] sm:items-center sm:justify-center">
          <div className="inline-flex h-11 w-fit items-center gap-1 self-center rounded-[1rem] border border-white/90 bg-white/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_32px_-28px_rgba(15,23,42,0.22)] sm:h-12 sm:gap-1.5 sm:rounded-[1.15rem] sm:p-1.5">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex h-full items-center justify-center gap-1.5 rounded-[0.9rem] px-4 py-2 text-[0.76rem] font-semibold uppercase tracking-[0.08em] transition-[background-color,color,box-shadow] duration-150 sm:gap-2 sm:rounded-[1rem] sm:px-6 sm:py-2.5 sm:text-[0.88rem]',
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

          <div className="flex flex-col gap-2.5 self-stretch sm:absolute sm:right-0 sm:top-1/2 sm:w-auto sm:-translate-y-1/2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <label className="grid gap-1 text-left sm:min-w-[13rem]">
              <span className="px-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Orden</span>
              <select
                aria-label="Ordenar por"
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as ExploreSort)}
                className={cn('app-control h-10 rounded-[0.9rem] px-4 text-[0.84rem] font-semibold text-slate-950', 'sm:h-11 sm:rounded-[0.95rem] sm:text-[0.88rem]')}
              >
                <option value="verification">Más verificadas primero</option>
                <option value="price">Precio más bajo</option>
                <option value="price-desc">Precio más alto</option>
              </select>
            </label>

            {hasActiveFilters ? (
              <Button
                type="button"
                onClick={onClear}
                variant="ghost"
                size="sm"
                className="h-10 self-end rounded-[0.9rem] px-3 text-[0.8rem] text-slate-700 sm:h-11 sm:self-auto sm:rounded-[0.95rem] sm:px-3.5 sm:text-[0.86rem] sm:text-slate-900"
              >
                <Icons.X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/80 bg-white/70 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:rounded-[24px] sm:p-4">
          <div
            data-testid="explore-filters-controls"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(17.5rem,1.15fr)] xl:items-stretch xl:gap-5"
          >
            <label className="grid min-w-0 gap-1.5 text-left">
              <span className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Ingreso</span>
              <Input
                type="date"
                aria-label="Ingreso"
                value={filters.checkIn}
                min={todayIso}
                onChange={(event) => handleCheckInChange(event.target.value)}
                icon={<Icons.Calendar className="h-4 w-4" />}
                wrapperClassName="w-full"
                className={cn(sharedControlClassName, 'py-0 pl-11 pr-4')}
              />
            </label>

            <label className="grid min-w-0 gap-1.5 text-left">
              <span className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Salida</span>
              <Input
                type="date"
                aria-label="Salida"
                value={filters.checkOut}
                min={filters.checkIn || todayIso}
                disabled={!filters.checkIn}
                onChange={(event) => handleCheckOutChange(event.target.value)}
                icon={<Icons.Calendar className="h-4 w-4" />}
                wrapperClassName="w-full"
                className={cn(sharedControlClassName, 'py-0 pl-11 pr-4 disabled:border-slate-200 disabled:bg-slate-50')}
              />
            </label>

            <label className="grid min-w-0 gap-1.5 text-left">
              <span className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Huéspedes</span>
              <select
                aria-label="Cantidad de huéspedes"
                value={filters.guests}
                onChange={(event) => onFiltersChange({ ...filters, guests: event.target.value })}
                className={cn('app-control px-4.5', sharedControlClassName)}
              >
                <option value="1">1 huésped</option>
                <option value="2">2 huéspedes</option>
                <option value="3">3 huéspedes</option>
                <option value="4">4 huéspedes</option>
                <option value="5">5 huéspedes</option>
                <option value="6">6 huéspedes</option>
                <option value="8">8 huéspedes</option>
                <option value="10">10 o más</option>
              </select>
            </label>

            <label className={cn(
              'flex min-h-[4rem] min-w-0 w-full items-center justify-between gap-3 rounded-[16px] border px-4 py-3 text-left shadow-[0_10px_24px_-26px_rgba(15,23,42,0.2)] transition-[border-color,background-color,box-shadow] duration-150 sm:min-h-[4.5rem] sm:rounded-[18px] sm:px-5',
              filters.verifiedOnly
                ? 'border-brand/18 bg-[linear-gradient(180deg,rgba(79,70,229,0.07)_0%,rgba(79,70,229,0.03)_100%)]'
                : 'border-[rgba(15,23,42,0.06)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]',
            )}>
              <span className="flex min-w-0 flex-1 flex-col justify-center pr-2">
                <span className="block text-[0.84rem] font-semibold tracking-[-0.015em] leading-[1.15] text-slate-900">
                  Solo propiedades verificadas presencialmente
                </span>
                <span className="mt-1 block text-[0.68rem] font-medium tracking-[-0.01em] leading-[1.15] text-slate-500 sm:text-[0.72rem]">
                  Filtra solo avisos con visita real
                </span>
              </span>

              <span className="relative inline-flex h-7 w-[3.15rem] shrink-0 items-center self-center">
                <input
                  type="checkbox"
                  aria-label="Solo verificados presencialmente"
                  checked={filters.verifiedOnly}
                  onChange={(event) => onFiltersChange({ ...filters, verifiedOnly: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-200/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] transition-colors duration-150 peer-checked:bg-brand/95" />
                <span className="absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.14)] transition-transform duration-150 peer-checked:translate-x-[1.35rem]" />
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreFiltersBar;