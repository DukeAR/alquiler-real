import { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from './ui/Input';

export interface LocationSuggestion {
  id: string;
  name: string;
  region: string;
  propertyCount: number;
}

// Mock locations database - Argentine coastal cities with rentals
const MOCK_LOCATIONS: LocationSuggestion[] = [
  { id: '1', name: 'Mar del Plata', region: 'Buenos Aires', propertyCount: 324 },
  { id: '2', name: 'Tigre', region: 'Buenos Aires', propertyCount: 189 },
  { id: '3', name: 'San Isidro', region: 'Buenos Aires', propertyCount: 156 },
  { id: '4', name: 'Pinamar', region: 'Buenos Aires', propertyCount: 287 },
  { id: '5', name: 'Villa Gesell', region: 'Buenos Aires', propertyCount: 234 },
  { id: '6', name: 'Bragado', region: 'Buenos Aires', propertyCount: 92 },
  { id: '7', name: 'Mendoza', region: 'Mendoza', propertyCount: 456 },
  { id: '8', name: 'Bariloche', region: 'Río Negro', propertyCount: 378 },
  { id: '9', name: 'Córdoba', region: 'Córdoba', propertyCount: 267 },
  { id: '10', name: 'Salta', region: 'Salta', propertyCount: 145 },
  { id: '11', name: 'La Plata', region: 'Buenos Aires', propertyCount: 198 },
  { id: '12', name: 'Rosario', region: 'Santa Fe', propertyCount: 289 },
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSelect?: (location: LocationSuggestion) => void;
  onSubmitValue?: (value: string) => void;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = '¿Dónde querés alojarte?',
  onSelect,
  onSubmitValue,
}: LocationAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const filtered = MOCK_LOCATIONS.filter(
      loc =>
        loc.name.toLowerCase().includes(value.toLowerCase()) ||
        loc.region.toLowerCase().includes(value.toLowerCase())
    ).sort((a, b) => {
      // Exact matches first
      if (a.name.toLowerCase() === value.toLowerCase()) return -1;
      if (b.name.toLowerCase() === value.toLowerCase()) return 1;
      // Then by property count
      return b.propertyCount - a.propertyCount;
    });

    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [value]);

  // Close on outside click
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && value.trim()) {
        e.preventDefault();
        setIsOpen(false);
        onSubmitValue?.(value.trim());
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
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectLocation(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectLocation(suggestions[0]);
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
          onFocus={() => value.trim().length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Buscar ubicación"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? 'location-suggestions' : undefined}
          aria-activedescendant={isOpen && selectedIndex >= 0 ? `location-option-${suggestions[selectedIndex]?.id}` : undefined}
          icon={<Icons.MapPin className="h-4 w-4 md:h-5 md:w-5" />}
          endAdornment={value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setSelectedIndex(-1);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Borrar búsqueda de ubicación"
            >
              <Icons.X className="h-4 w-4 text-slate-400" />
            </button>
          ) : null}
          className={cn(
            'rounded-2xl py-3 text-sm md:py-3.5 md:text-base',
            isOpen && 'rounded-b-none md:rounded-b-none'
          )}
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            id="location-suggestions"
            role="listbox"
            aria-label="Sugerencias de ubicación"
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-0 bg-white dark:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-xl md:rounded-b-2xl shadow-xl max-h-80 overflow-y-auto"
          >
            {suggestions.map((location, index) => (
              <motion.button
                id={`location-option-${location.id}`}
                key={location.id}
                type="button"
                role="option"
                aria-selected={selectedIndex === index}
                aria-label={`${location.name}, ${location.region}, ${location.propertyCount} propiedades`}
                onClick={() => handleSelectLocation(location)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-b-0 md:px-5 md:py-4',
                  selectedIndex === index
                    ? 'bg-brand/5 dark:bg-brand/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                )}
                whileHover={{ x: 2 }}
              >
                <div className="flex-1">
                  <p className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                    {location.name}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    {location.region} • {location.propertyCount} propiedades
                  </p>
                </div>
                {selectedIndex === index && (
                  <Icons.ChevronRight className="w-4 h-4 text-brand" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {isOpen && value.trim().length > 0 && suggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            aria-live="polite"
            className="absolute top-full left-0 right-0 z-50 mt-0 rounded-b-xl border border-t-0 border-slate-200 bg-white p-5 text-center shadow-xl md:rounded-b-2xl md:p-6 dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              No encontramos "{value}"
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Probá con otra ubicación
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
