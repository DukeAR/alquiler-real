import { useMemo, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { type Zone } from '../lib/constants';
import { getPropertyListingQualityScore } from '../lib/propertyListingQuality';
import { PLATFORM_PUBLISHING_RESPONSIBILITY_NOTE } from '../lib/platformTerms';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';

type PropertyType = 'apartment' | 'house' | 'room';
type WizardStepId = 'photos' | 'location' | 'type' | 'capacity' | 'price' | 'description' | 'preview';

type PublishPayload = {
  title: string;
  location: string;
  price: number;
  description: string;
  imageUrl: string;
  images: string[];
  maxGuests: number;
  beds: number;
  propertyType: PropertyType;
  lat: number | null;
  lng: number | null;
};

type PropertyUploadFormProps = {
  onComplete: (propertyId?: string) => void;
};

type StepDefinition = {
  id: WizardStepId;
  title: string;
  shortTitle: string;
  description: string;
};

type LocationOption = {
  zone: Zone;
  note: string;
  lat: number;
  lng: number;
  top: string;
  left: string;
};

const PHOTO_FIELDS = [
  {
    label: 'Foto 1',
    helperText: 'Mostrá el frente, el ingreso o la vista que mejor explica el lugar.',
  },
  {
    label: 'Foto 2',
    helperText: 'Sumá el ambiente principal o donde más tiempo pasan.',
  },
  {
    label: 'Foto 3',
    helperText: 'Mostrá dónde duermen o descansan.',
  },
  {
    label: 'Foto 4',
    helperText: 'Completá con baño, exterior o un detalle útil para decidir.',
  },
] as const;

const LOCATION_OPTIONS: LocationOption[] = [
  {
    zone: 'San Clemente del Tuyú',
    note: 'Centro y playa norte',
    lat: -36.3601,
    lng: -56.7228,
    top: '18%',
    left: '18%',
  },
  {
    zone: 'Las Toninas',
    note: 'Zona tranquila y familiar',
    lat: -36.4879,
    lng: -56.6974,
    top: '37%',
    left: '42%',
  },
  {
    zone: 'Santa Teresita',
    note: 'Centro y costanera',
    lat: -36.5426,
    lng: -56.6886,
    top: '56%',
    left: '60%',
  },
  {
    zone: 'Mar del Tuyú',
    note: 'Zona sur y playa amplia',
    lat: -36.5798,
    lng: -56.6872,
    top: '74%',
    left: '78%',
  },
] as const;

const PROPERTY_TYPES: Array<{ value: PropertyType; label: string; description: string; icon: keyof typeof Icons }> = [
  {
    value: 'apartment',
    label: 'Departamento',
    description: 'Ideal para monoambientes, edificios o espacios compactos con entrada compartida.',
    icon: 'LayoutGrid',
  },
  {
    value: 'house',
    label: 'Casa',
    description: 'Para propiedades completas con patio, lote o acceso independiente.',
    icon: 'Home',
  },
  {
    value: 'room',
    label: 'Habitación',
    description: 'Cuando ofrecés una habitación dentro de una propiedad ya ocupada.',
    icon: 'BedDouble',
  },
] as const;

const WIZARD_STEPS: StepDefinition[] = [
  {
    id: 'photos',
    title: 'Fotos',
    shortTitle: 'Fotos',
    description: 'Arrancá con 4 fotos claras. Es lo único visual que pedimos para publicar.',
  },
  {
    id: 'location',
    title: 'Ubicación',
    shortTitle: 'Ubicación',
    description: 'Marcá la zona aproximada y, si querés, sumá barrio o referencia. No hace falta dirección exacta.',
  },
  {
    id: 'type',
    title: 'Tipo de propiedad',
    shortTitle: 'Tipo',
    description: 'Dejá claro rápido si es departamento, casa o habitación.',
  },
  {
    id: 'capacity',
    title: 'Capacidad',
    shortTitle: 'Capacidad',
    description: 'Solo pedimos personas y camas para que se entienda si encaja con la búsqueda.',
  },
  {
    id: 'price',
    title: 'Precio',
    shortTitle: 'Precio',
    description: 'Definí un precio por noche y seguís. El resto lo ajustás después si hace falta.',
  },
  {
    id: 'description',
    title: 'Descripción',
    shortTitle: 'Descripción',
    description: 'Te guiamos con prompts cortos y un título sugerido para que no arranques de cero.',
  },
  {
    id: 'preview',
    title: 'Preview y publicar',
    shortTitle: 'Preview',
    description: 'Revisá cómo lo van a ver y publicá con lo mínimo completo.',
  },
] as const;

const formatCurrency = (value: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
}).format(value);

const percentageForStep = (stepIndex: number) => Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

const normalizePhotoUrls = (photoUrls: string[]) => {
  const uniqueUrls = new Set<string>();

  photoUrls.forEach((photoUrl) => {
    const normalizedValue = photoUrl.trim();

    if (normalizedValue) {
      uniqueUrls.add(normalizedValue);
    }
  });

  return [...uniqueUrls];
};

const ensureSentence = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  return /[.!?]$/.test(trimmedValue) ? trimmedValue : `${trimmedValue}.`;
};

const getPropertyTypeLabel = (propertyType: PropertyType | null) => {
  if (propertyType === 'room') return 'Habitación';
  if (propertyType === 'apartment') return 'Departamento';
  if (propertyType === 'house') return 'Casa';
  return 'Alojamiento';
};

const buildLocationAreaLabel = (zone: Zone | null, locationReference: string) => {
  if (!zone) {
    return 'la zona elegida';
  }

  const normalizedReference = locationReference.trim();
  return normalizedReference ? `${normalizedReference}, ${zone}` : zone;
};

const buildLocationLabel = (zone: Zone | null, locationReference: string) => {
  if (!zone) {
    return '';
  }

  const normalizedReference = locationReference.trim();
  return normalizedReference ? `${zone} · ${normalizedReference}` : zone;
};

const buildTitleSuggestion = (
  propertyType: PropertyType | null,
  guests: number,
  zone: Zone | null,
  locationReference: string,
) => {
  const typeLabel = getPropertyTypeLabel(propertyType);
  const guestLabel = `${guests} ${guests === 1 ? 'persona' : 'personas'}`;
  const locationLabel = buildLocationAreaLabel(zone, locationReference);

  return `${typeLabel} para ${guestLabel} en ${locationLabel}`;
};

const buildDescription = (data: {
  arrivalNote: string;
  comfortNote: string;
  idealForNote: string;
}) => {
  const parts = [
    ensureSentence(data.arrivalNote),
    ensureSentence(data.comfortNote),
    data.idealForNote.trim() ? ensureSentence(`Ideal para ${data.idealForNote.trim()}`) : '',
  ].filter(Boolean);

  return parts.join(' ');
};

const buildPublishPayload = (data: {
  photoUrls: string[];
  zone: Zone | null;
  locationReference: string;
  propertyType: PropertyType | null;
  guests: number;
  beds: number;
  price: number;
  title: string;
  arrivalNote: string;
  comfortNote: string;
  idealForNote: string;
}): PublishPayload => {
  const selectedLocation = LOCATION_OPTIONS.find((option) => option.zone === data.zone) ?? null;
  const images = normalizePhotoUrls(data.photoUrls);
  const location = buildLocationLabel(data.zone, data.locationReference);
  const generatedTitle = buildTitleSuggestion(data.propertyType, data.guests, data.zone, data.locationReference);

  return {
    title: data.title.trim() || generatedTitle,
    location,
    price: data.price,
    description: buildDescription({
      arrivalNote: data.arrivalNote,
      comfortNote: data.comfortNote,
      idealForNote: data.idealForNote,
    }),
    imageUrl: images[0] ?? '',
    images,
    maxGuests: data.guests,
    beds: data.beds,
    propertyType: data.propertyType ?? 'house',
    lat: selectedLocation?.lat ?? null,
    lng: selectedLocation?.lng ?? null,
  };
};

export const PropertyUploadForm: React.FC<PropertyUploadFormProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => PHOTO_FIELDS.map(() => ''));
  const [zone, setZone] = useState<Zone | null>(null);
  const [locationReference, setLocationReference] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [guests, setGuests] = useState(4);
  const [beds, setBeds] = useState(3);
  const [price, setPrice] = useState(95000);
  const [title, setTitle] = useState('');
  const [arrivalNote, setArrivalNote] = useState('');
  const [comfortNote, setComfortNote] = useState('');
  const [idealForNote, setIdealForNote] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedPropertyId, setPublishedPropertyId] = useState<string | null>(null);
  const [publishedPropertyTitle, setPublishedPropertyTitle] = useState('');

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const progress = percentageForStep(currentStepIndex);
  const remainingSteps = WIZARD_STEPS.slice(currentStepIndex + 1);
  const isLastStep = currentStep.id === 'preview';
  const selectedLocation = useMemo(
    () => LOCATION_OPTIONS.find((option) => option.zone === zone) ?? null,
    [zone],
  );

  const normalizedPhotos = useMemo(() => normalizePhotoUrls(photoUrls), [photoUrls]);
  const generatedTitle = useMemo(
    () => buildTitleSuggestion(propertyType, guests, zone, locationReference),
    [guests, locationReference, propertyType, zone],
  );
  const generatedDescription = useMemo(
    () => buildDescription({ arrivalNote, comfortNote, idealForNote }),
    [arrivalNote, comfortNote, idealForNote],
  );

  const publishPayload = useMemo(
    () => buildPublishPayload({
      photoUrls,
      zone,
      locationReference,
      propertyType,
      guests,
      beds,
      price,
      title,
      arrivalNote,
      comfortNote,
      idealForNote,
    }),
    [arrivalNote, beds, comfortNote, guests, idealForNote, locationReference, photoUrls, price, propertyType, title, zone],
  );

  const listingQualityScore = useMemo(
    () => getPropertyListingQualityScore(publishPayload),
    [publishPayload],
  );

  const minimumHighlights = useMemo(
    () => [
      { label: '4 fotos', done: normalizedPhotos.length >= PHOTO_FIELDS.length },
      { label: 'ubicación', done: Boolean(zone) },
      { label: 'tipo', done: Boolean(propertyType) },
      { label: 'capacidad', done: guests > 0 && beds > 0 },
      { label: 'precio', done: Number.isFinite(price) && price > 0 },
    ],
    [beds, guests, normalizedPhotos.length, price, propertyType, zone],
  );

  const missingMinimumHighlights = minimumHighlights.filter((item) => !item.done).map((item) => item.label);

  const postPublishSuggestions = useMemo(() => {
    const suggestions = [
      {
        title: 'Recibí más consultas con mejores fotos',
        description: 'Ya saliste al aire. Sumá cocina, exterior o detalles para que el lugar se entienda mejor en segundos.',
      },
      {
        title: 'Hacé más claro el aviso con identidad y video',
        description: 'Desde el panel podés sumar esas comprobaciones para que el aviso tenga más trazabilidad sin volver a empezar la publicación.',
      },
    ];

    if (!generatedDescription) {
      suggestions.splice(1, 0, {
        title: 'Mejorá tu visibilidad con una descripcion corta',
        description: 'Con dos o tres frases sobre entorno y comodidad, la ficha queda mas clara para decidir.',
      });
    } else if (!locationReference.trim()) {
      suggestions.splice(1, 0, {
        title: 'Mejorá tu visibilidad con una ubicacion mas clara',
        description: 'Sumá barrio, zona o una referencia simple para que te pregunten menos y entiendan mejor donde esta.',
      });
    }

    return suggestions.slice(0, 3);
  }, [generatedDescription, locationReference]);

  const updatePhoto = (index: number, value: string) => {
    setPhotoUrls((current) => current.map((photo, currentIndex) => currentIndex === index ? value : photo));
  };

  const getStepError = () => {
    switch (currentStep.id) {
      case 'photos':
        if (normalizedPhotos.length < PHOTO_FIELDS.length) {
          return 'Sumá al menos 4 fotos claras para publicar.';
        }
        return null;
      case 'location':
        if (!zone) {
          return 'Marcá la zona aproximada para seguir.';
        }
        return null;
      case 'type':
        if (!propertyType) {
          return 'Elegí si es departamento, casa o habitación.';
        }
        return null;
      case 'capacity':
        if (guests < 1 || beds < 1) {
          return 'Indicá al menos una persona y una cama para seguir.';
        }
        return null;
      case 'price':
        if (!Number.isFinite(price) || price <= 0) {
          return 'Definí un precio por noche para seguir.';
        }
        return null;
      case 'preview':
        if (missingMinimumHighlights.length > 0) {
          return `Todavía falta completar ${missingMinimumHighlights.join(', ')}.`;
        }
        return null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const error = getStepError();

    if (error) {
      showToast('Falta un paso', error, 'warning');
      return;
    }

    setCurrentStepIndex((current) => Math.min(current + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => {
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  };

  const handlePublish = async () => {
    const error = getStepError();

    if (error) {
      showToast('Revisá la publicación', error, 'warning');
      return;
    }

    setIsPublishing(true);

    try {
      const response = await apiJson<{ id?: string }>('/api/properties', {
        method: 'POST',
        body: JSON.stringify(publishPayload),
        includeCredentials: true,
      });

      setPublishedPropertyId(typeof response?.id === 'string' ? response.id : null);
      setPublishedPropertyTitle(publishPayload.title);
      setIsPublished(true);
      showToast('Publicacion creada', 'Tu publicacion ya esta activa. Desde el panel podes mejorarla para que se entienda mejor y reciba mas consultas.', 'success');
    } catch (error) {
      showToast('Publicacion', error instanceof Error ? error.message : 'No pudimos crear la publicacion.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isPublished) {
    return (
      <div className="mx-auto max-w-4xl px-4">
        <Card
          variant="elevated"
          padding="lg"
          className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_32px_80px_-42px_rgba(15,23,42,0.3)]"
        >
          <div className="space-y-6">
            <Badge variant="success" size="md">
              <Icons.CheckCircle2 className="h-4 w-4" />
              Ya esta activa
            </Badge>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Tu publicacion ya esta activa
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                {publishedPropertyTitle || 'Tu propiedad'} ya quedo visible. Podes mejorarla para que se entienda mejor y reciba mas consultas.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {postPublishSuggestions.map((suggestion) => (
                <Card key={suggestion.title} variant="muted" padding="md" className="space-y-2 border-slate-200/80 bg-white/90">
                  <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
                  <p className="text-sm leading-6 text-slate-600">{suggestion.description}</p>
                </Card>
              ))}
            </div>

            <Button type="button" onClick={() => onComplete(publishedPropertyId ?? undefined)}>
              <Icons.LayoutDashboard className="h-4 w-4" />
              Mejorar publicacion
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4">
      <Card
        variant="elevated"
        padding="lg"
        className="border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_32px_80px_-42px_rgba(15,23,42,0.3)]"
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="brand" size="md">
                <Icons.LayoutDashboard className="h-4 w-4" />
                Alta guiada
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Publica tu propiedad en pocos pasos</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Te pedimos solo lo justo para activarla rapido. Despues la mejoras desde el panel para que el aviso sea mas claro y reciba mas consultas.
                </p>
              </div>
            </div>

            <div className="min-w-[220px] space-y-2 rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Progreso</span>
                <span className="font-semibold text-brand">{progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand via-cyan-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {remainingSteps.length > 0 ? `${remainingSteps.length} pasos más hasta publicar.` : 'Último paso antes de publicar.'}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
            {PLATFORM_PUBLISHING_RESPONSIBILITY_NOTE}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isDone = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                    isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : isActive
                        ? 'border-brand/20 bg-brand/5 text-brand'
                        : 'border-slate-200 bg-white/90 text-slate-500',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-brand text-white'
                          : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {isDone ? <Icons.Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="font-medium">{step.shortTitle}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card padding="lg" className="border-slate-200/80 bg-white/96 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.3)]">
        <div className="space-y-6">
          <div className="space-y-2">
            <Badge variant="neutral" size="md">
              Paso {currentStepIndex + 1} de {WIZARD_STEPS.length}
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{currentStep.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{currentStep.description}</p>
            </div>
          </div>

          {currentStep.id === 'photos' ? (
            <div className="space-y-6">
              <NoticeBanner
                tone="info"
                heading="Para publicar te pedimos 4 fotos."
                description="Con esta base ya se entiende el lugar. Más adelante podés sumar el resto sin bloquear el alta."
              />

              <div className="grid gap-4 md:grid-cols-2">
                {PHOTO_FIELDS.map((field, index) => (
                  <Input
                    key={field.label}
                    id={`property-photo-${index + 1}`}
                    label={field.label}
                    value={photoUrls[index] ?? ''}
                    onChange={(event) => updatePhoto(index, event.target.value)}
                    placeholder="https://..."
                    helperText={field.helperText}
                  />
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PHOTO_FIELDS.map((field, index) => {
                  const photoUrl = photoUrls[index]?.trim();

                  return (
                    <div key={`preview-${field.label}`} className="space-y-2">
                      <div className="aspect-[4/3] overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                        {photoUrl ? (
                          <img src={photoUrl} alt={field.label} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                            <Icons.ImagePlus className="h-7 w-7" />
                            <p className="text-xs font-medium text-slate-500">{field.label}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs leading-5 text-slate-500">{field.helperText}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep.id === 'location' ? (
            <div className="space-y-6">
              <div className="relative min-h-[320px] overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_34%),linear-gradient(180deg,rgba(226,232,240,0.18),rgba(248,250,252,0.98))] p-6">
                <div className="absolute inset-x-8 top-8 h-[1px] bg-slate-300/70" />
                <div className="absolute inset-x-10 top-[34%] h-[1px] bg-slate-300/60" />
                <div className="absolute inset-x-14 top-[62%] h-[1px] bg-slate-300/50" />
                <div className="absolute left-[12%] top-[12%] text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Costa
                </div>

                {LOCATION_OPTIONS.map((option) => {
                  const isSelected = zone === option.zone;

                  return (
                    <button
                      key={option.zone}
                      type="button"
                      onClick={() => setZone(option.zone)}
                      className={cn(
                        'absolute -translate-x-1/2 -translate-y-1/2 rounded-[22px] border px-4 py-3 text-left shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] transition-[transform,border-color,background-color] hover:-translate-y-[55%]',
                        isSelected
                          ? 'border-brand/25 bg-white text-slate-900'
                          : 'border-white/70 bg-white/90 text-slate-600',
                      )}
                      style={{ top: option.top, left: option.left }}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn('mt-0.5 inline-flex h-3.5 w-3.5 rounded-full', isSelected ? 'bg-brand ring-4 ring-brand/15' : 'bg-slate-300')} />
                        <span className="block min-w-0">
                          <span className="block text-sm font-semibold">{option.zone}</span>
                          <span className="block text-xs leading-5 text-slate-500">{option.note}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Input
                id="property-location-reference"
                label="Barrio o referencia útil"
                value={locationReference}
                onChange={(event) => setLocationReference(event.target.value)}
                placeholder="Ej: centro, a dos cuadras de la playa, costanera"
                helperText="Opcional. Sirve para orientar mejor sin pedir dirección exacta ni altura."
              />

              <Card variant="muted" padding="md" className="border-slate-200/80 bg-white/92">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Icons.MapPin className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Ubicación que va a ver la persona interesada</p>
                    <p className="text-sm leading-6 text-slate-600">
                      {buildLocationLabel(zone, locationReference) || 'Todavía no marcaste una zona.'}
                    </p>
                    {selectedLocation ? (
                      <p className="text-xs text-slate-500">Usamos una ubicación aproximada para orientar en el mapa sin mostrar precisión innecesaria.</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {currentStep.id === 'type' ? (
            <div className="grid gap-3 md:grid-cols-3">
              {PROPERTY_TYPES.map((item) => {
                const Icon = Icons[item.icon];
                const isSelected = propertyType === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPropertyType(item.value)}
                    className={cn(
                      'rounded-[28px] border p-5 text-left transition-[border-color,background-color,transform,box-shadow] hover:-translate-y-px',
                      isSelected
                        ? 'border-brand/25 bg-brand/5 shadow-[0_22px_40px_-32px_rgba(14,116,144,0.36)]'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          {currentStep.id === 'capacity' ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id="property-guests"
                  label="Personas"
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(event) => setGuests(Math.max(1, Number(event.target.value) || 1))}
                  helperText="Indicá cuántas personas pueden quedarse cómodas."
                />
                <Input
                  id="property-beds"
                  label="Camas"
                  type="number"
                  min={1}
                  value={beds}
                  onChange={(event) => setBeds(Math.max(1, Number(event.target.value) || 1))}
                  helperText="Solo pedimos camas. No hace falta completar dormitorios ni baños en esta etapa."
                />
              </div>

              <Card variant="muted" padding="lg" className="border-slate-200/80 bg-white/92">
                <p className="text-sm font-semibold text-slate-900">Cómo se va a entender esta parte</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Se va a mostrar para hasta {guests} {guests === 1 ? 'persona' : 'personas'} con {beds} {beds === 1 ? 'cama' : 'camas'}.
                </p>
              </Card>
            </div>
          ) : null}

          {currentStep.id === 'price' ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
                <Input
                  id="property-price"
                  label="Precio por noche"
                  type="number"
                  min={1}
                  value={price}
                  onChange={(event) => setPrice(Math.max(1, Number(event.target.value) || 1))}
                  helperText="Publicás con un solo valor. Después lo ajustás por temporada si querés."
                />

                <Card variant="muted" padding="lg" className="space-y-3 border-slate-200/80 bg-white/90">
                  <p className="text-sm font-semibold text-slate-900">Vista rápida</p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">{formatCurrency(price)}</p>
                  <p className="text-sm leading-6 text-slate-600">Esto es lo que se va a ver como precio base por noche.</p>
                </Card>
              </div>
            </div>
          ) : null}

          {currentStep.id === 'description' ? (
            <div className="space-y-6">
              <Input
                id="property-title"
                label="Título sugerido"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={generatedTitle}
                helperText="Lo generamos automáticamente con tipo, capacidad y zona. Solo editás si querés ajustar el tono."
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  id="property-arrival-note"
                  label="¿Qué van a encontrar apenas llegan?"
                  value={arrivalNote}
                  onChange={(event) => setArrivalNote(event.target.value)}
                  placeholder="Ej: A dos cuadras de la playa y cerca del centro"
                  helperText="Opcional. Ayuda a ubicar rápido el lugar."
                />
                <Input
                  id="property-comfort-note"
                  label="¿Qué hace cómodo el lugar?"
                  value={comfortNote}
                  onChange={(event) => setComfortNote(event.target.value)}
                  placeholder="Ej: Living amplio, cocina equipada y buena luz"
                  helperText="Opcional. Priorizá una o dos cosas concretas."
                />
                <Input
                  id="property-ideal-for-note"
                  label="¿Para quién funciona mejor?"
                  value={idealForNote}
                  onChange={(event) => setIdealForNote(event.target.value)}
                  placeholder="Ej: una familia, pareja o grupo chico"
                  helperText="Opcional. Sirve para que se identifiquen rápido."
                />
              </div>

              <Card variant="muted" padding="lg" className="space-y-3 border-slate-200/80 bg-white/92">
                <p className="text-sm font-semibold text-slate-900">Así queda la descripción</p>
                <p className="text-sm leading-7 text-slate-600">
                  {generatedDescription || 'Si dejás los prompts vacíos, podés publicar igual y completar esta parte después.'}
                </p>
              </Card>
            </div>
          ) : null}

          {currentStep.id === 'preview' ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryTile label="Tipo" value={getPropertyTypeLabel(propertyType)} />
                <SummaryTile label="Ubicación" value={publishPayload.location || 'Sin definir'} />
                <SummaryTile label="Capacidad" value={`${guests} ${guests === 1 ? 'persona' : 'personas'} · ${beds} ${beds === 1 ? 'cama' : 'camas'}`} />
                <SummaryTile label="Precio" value={formatCurrency(price)} />
              </div>

              <Card variant="muted" padding="lg" className="space-y-4 border-slate-200/80 bg-white/92">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Así lo van a ver los huéspedes</p>
                    <p className="mt-1 text-sm text-slate-500">Fotos, título, ubicación y precio bien visibles antes de publicar.</p>
                  </div>
                  <Badge variant="brand" size="md">{progress}% listo</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {photoUrls.map((photoUrl, index) => (
                      <div key={`summary-photo-${index + 1}`} className="aspect-[4/3] overflow-hidden rounded-[24px] bg-slate-100">
                        {photoUrl.trim() ? (
                          <img src={photoUrl.trim()} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Icons.ImagePlus className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900">{publishPayload.title}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Icons.MapPin className="h-4 w-4 text-brand" />
                          {publishPayload.location || 'Ubicación sin definir'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Icons.Users className="h-4 w-4 text-brand" />
                          {guests} {guests === 1 ? 'persona' : 'personas'}
                        </span>
                      </div>
                      <p className="text-3xl font-semibold tracking-tight text-slate-950">{formatCurrency(price)}</p>
                    </div>

                    <p className="text-sm leading-7 text-slate-600">
                      {publishPayload.description || 'Todavía no sumaste descripción. Podés publicar igual y completarla después.'}
                    </p>
                  </div>
                </div>
              </Card>

              <NoticeBanner
                tone={missingMinimumHighlights.length > 0 ? 'warning' : listingQualityScore >= 60 ? 'success' : 'info'}
                heading={missingMinimumHighlights.length > 0
                  ? 'Todavía falta una base mínima para publicar.'
                  : listingQualityScore >= 60
                    ? 'La publicación ya quedó clara para salir.'
                    : 'La base mínima ya alcanza para publicar.'}
                description={missingMinimumHighlights.length > 0
                  ? `Completá ${missingMinimumHighlights.join(', ')} y ya podés publicarla.`
                  : 'Si querés mejorarla después, el sistema te va a sugerir próximos pasos sin bloquear nada.'}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
            <div className="text-sm text-slate-500">
              {remainingSteps.length > 0 ? `Después sigue: ${remainingSteps[0]?.shortTitle}.` : 'Siguiente acción: publicar propiedad.'}
            </div>

            <div className="flex flex-wrap gap-3">
              {currentStepIndex > 0 ? (
                <Button type="button" variant="secondary" onClick={goBack}>
                  <Icons.ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
              ) : null}

              {!isLastStep ? (
                <Button type="button" onClick={goNext}>
                  {currentStepIndex === 0 ? 'Empezar' : 'Siguiente paso'}
                  <Icons.ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handlePublish()}
                  loading={isPublishing}
                  loadingLabel="Publicando propiedad..."
                >
                  <Icons.CheckCircle2 className="h-4 w-4" />
                  Publicar propiedad
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

type SummaryTileProps = {
  label: string;
  value: string;
};

const SummaryTile = ({ label, value }: SummaryTileProps) => {
  return (
    <Card variant="muted" padding="md" className="space-y-2 border-slate-200/80 bg-white/90">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </Card>
  );
};

export default PropertyUploadForm;
