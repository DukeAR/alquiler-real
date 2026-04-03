import { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from './ui/Input';

export interface LocationSuggestion {
  id: string;
  name: string;
  region?: string;
  propertyCount: number;
}

const EMPTY_LOCATION_SUGGESTIONS: LocationSuggestion[] = [];

const formatPropertyCount = (count: number) => {
  if (count === 1) {
    return '1 propiedad';
  }

  return `${count} propiedades`;
};

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSelect?: (location: LocationSuggestion) => void;
  onSubmitValue?: (value: string) => void;
  suggestions?: LocationSuggestion[];
}

export const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = 'Elegí ciudad, playa o zona',
  onSelect,
  onSubmitValue,
  suggestions: availableSuggestions = EMPTY_LOCATION_SUGGESTIONS,
}: LocationAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedValue = value.trim();
  const hasIndexedSuggestions = availableSuggestions.length > 0;
  const hasTypedValue = normalizedValue.length > 0;
  const showSuggestions = isOpen && filteredSuggestions.length > 0;
  const showEmptyState = isOpen && hasTypedValue && filteredSuggestions.length === 0;

  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const filtered = availableSuggestions.filter(
      loc =>
        loc.name.toLowerCase().includes(value.toLowerCase()) ||
        loc.region?.toLowerCase().includes(value.toLowerCase())
    ).sort((a, b) => {
      if (a.name.toLowerCase() === value.toLowerCase()) return -1;
      if (b.name.toLowerCase() === value.toLowerCase()) return 1;
      return b.propertyCount - a.propertyCount;
    });

    setFilteredSuggestions(filtered);
    setSelectedIndex(-1);
  }, [availableSuggestions, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'Enter' && normalizedValue) {
        e.preventDefault();
        setIsOpen(false);
        onSubmitValue?.(normalizedValue);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }

      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectLocation(filteredSuggestions[selectedIndex]);
        } else if (filteredSuggestions.length > 0) {
          handleSelectLocation(filteredSuggestions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelectLocation = (location: LocationSuggestion) => {
    onChange(location.name);
    setIsOpen(false);
    onSelect?.(location);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(newValue.trim().length > 0);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => hasTypedValue && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Buscar ubicación"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? 'location-suggestions' : undefined}
          aria-activedescendant={isOpen && selectedIndex >= 0 ? `location-option-${filteredSuggestions[selectedIndex]?.id}` : undefined}
          icon={<Icons.MapPin className="h-4 w-4 md:h-5 md:w-5" />}
          endAdornment={value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setFilteredSuggestions([]);
                setSelectedIndex(-1);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label="Borrar búsqueda de ubicación"
            >
              <Icons.X className="h-4 w-4" />
            </button>
          ) : null}
          className={cn(
            'min-h-14 rounded-[24px] border-slate-200/90 bg-white py-3 text-[15px] font-medium text-slate-900 shadow-[0_20px_36px_-30px_rgba(15,23,42,0.55)] placeholder:text-slate-400 focus:border-brand/40 focus:shadow-[0_0_0_4px_rgba(14,116,144,0.12)] md:py-3.5',
            showSuggestions || showEmptyState ? 'rounded-b-[14px] border-b-transparent shadow-[0_20px_36px_-30px_rgba(15,23,42,0.4)] md:rounded-b-[16px]' : ''
          )}
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            id="location-suggestions"
            role="listbox"
            aria-label="Sugerencias de ubicación"
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_30px_70px_-38px_rgba(15,23,42,0.38)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 md:px-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Sugerencias para tu búsqueda
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {filteredSuggestions.length === 1
                    ? '1 opción para revisar'
                    : `${filteredSuggestions.length} opciones para revisar`}
                </p>
              </div>

              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 md:inline-flex">
                Enter para buscar igual
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto py-1.5">
            {filteredSuggestions.map((location, index) => (
              <motion.button
                id={`location-option-${location.id}`}
                key={location.id}
                type="button"
                role="option"
                aria-selected={selectedIndex === index}
                aria-label={`${location.name}${location.region ? `, ${location.region}` : ''}, ${location.propertyCount} propiedades`}
                onClick={() => handleSelectLocation(location)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors md:px-5 md:py-4',
                  selectedIndex === index
                    ? 'bg-brand/6'
                    : 'hover:bg-slate-50'
                )}
                whileHover={{ x: 2 }}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                    selectedIndex === index
                      ? 'border-brand/15 bg-brand text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-700'
                  )}
                >
                  <Icons.MapPin className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 md:text-[15px]">
                      {location.name}
                    </p>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {formatPropertyCount(location.propertyCount)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    {location.region ? `Zona: ${location.region}` : 'Explorá propiedades en esta zona.'}
                  </p>
                </div>

                <Icons.ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 transition-all',
                    selectedIndex === index
                      ? 'translate-x-0 text-brand'
                      : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500'
                  )}
                />
              </motion.button>
            ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {showEmptyState && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            aria-live="polite"
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.38)] md:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                <Icons.Search className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900 md:text-[15px]">
                  {hasIndexedSuggestions
                    ? `No encontramos coincidencias para "${normalizedValue}"`
                    : 'Todavía no hay sugerencias para esta búsqueda'}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {hasIndexedSuggestions
                    ? 'Podés buscar igual y después filtrar en resultados.'
                    : 'Escribí una ciudad, un barrio o una zona y buscá igual.'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Para seguir
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Presioná Enter para buscar <span className="font-semibold text-slate-900">"{normalizedValue}"</span>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
