import { useMemo, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { VALID_ZONES } from '../lib/constants';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';

type PropertyType = 'house' | 'apartment' | 'cabin';
type WizardStepId = 'type-location' | 'basics' | 'photos' | 'price' | 'availability' | 'verification' | 'summary';

type VerificationOption = {
  key: 'identity' | 'location' | 'visual' | 'onsite';
  title: string;
  description: string;
  recommended: string;
};

type PublishPayload = {
  title: string;
  location: string;
  price: number;
  description: string;
  imageUrl: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
};

type PropertyUploadFormProps = {
  onComplete: () => void;
};

type StepDefinition = {
  id: WizardStepId;
  title: string;
  shortTitle: string;
  description: string;
};

const PROPERTY_TYPES: Array<{ value: PropertyType; label: string; description: string; icon: keyof typeof Icons }> = [
  {
    value: 'house',
    label: 'Casa',
    description: 'Ideal si publicás una propiedad completa con patio, parque o entrada independiente.',
    icon: 'Home',
  },
  {
    value: 'apartment',
    label: 'Departamento',
    description: 'Para unidades en edificio, monoambientes o espacios más compactos.',
    icon: 'LayoutGrid',
  },
  {
    value: 'cabin',
    label: 'Cabaña',
    description: 'Para espacios de descanso con perfil más natural o de escapada.',
    icon: 'Coffee',
  },
];

const FEATURE_OPTIONS = [
  'WiFi',
  'Aire acondicionado',
  'Pileta',
  'Parrilla',
  'Cochera',
  'Patio',
  'Mascotas',
  'Cocina equipada',
  'Ropa de cama',
  'Vista abierta',
] as const;

const PHOTO_IDEAS = [
  'Frente o ingreso',
  'Ambiente principal',
  'Dormitorio',
  'Baño',
  'Exterior o vista',
] as const;

const VERIFICATION_OPTIONS: VerificationOption[] = [
  {
    key: 'identity',
    title: 'Identidad',
    description: 'Sumá validación de identidad para que sepan con quién están hablando.',
    recommended: 'Ayuda a dar confianza desde el primer contacto.',
  },
  {
    key: 'location',
    title: 'Ubicación',
    description: 'Confirmá la ubicación exacta cuando quieras mostrar más claridad.',
    recommended: 'Sirve para responder menos dudas sobre dónde está el lugar.',
  },
  {
    key: 'visual',
    title: 'Material real',
    description: 'Subí mejores fotos o video para mostrar cómo está hoy la propiedad.',
    recommended: 'Hace más fácil que entiendan qué van a encontrar.',
  },
  {
    key: 'onsite',
    title: 'Verificación presencial',
    description: 'Podés pedir una comprobación presencial desde el panel una vez publicado el aviso.',
    recommended: 'Suma información validada extra, pero no hace falta para publicar ahora.',
  },
];

const WIZARD_STEPS: StepDefinition[] = [
  {
    id: 'type-location',
    title: 'Tipo de propiedad y ubicación',
    shortTitle: 'Tipo y ubicación',
    description: 'Definí qué tipo de propiedad es y en qué zona está para arrancar rápido.',
  },
  {
    id: 'basics',
    title: 'Datos básicos',
    shortTitle: 'Datos básicos',
    description: 'Contá capacidad, ambientes y lo principal del lugar sin entrar en detalles largos.',
  },
  {
    id: 'photos',
    title: 'Fotos',
    shortTitle: 'Fotos',
    description: 'Dejá una portada ahora y anotá qué fotos te conviene sumar después.',
  },
  {
    id: 'price',
    title: 'Precio',
    shortTitle: 'Precio',
    description: 'Elegí un valor simple para publicar y ajustar más tarde si hace falta.',
  },
  {
    id: 'availability',
    title: 'Disponibilidad',
    shortTitle: 'Disponibilidad',
    description: 'Marcá cómo querés empezar para no trabarte con un calendario completo de entrada.',
  },
  {
    id: 'verification',
    title: 'Verificación',
    shortTitle: 'Verificación',
    description: 'Mostramos qué mejoras podés sumar, pero no bloquean esta primera publicación.',
  },
  {
    id: 'summary',
    title: 'Resumen y publicación',
    shortTitle: 'Resumen',
    description: 'Revisá lo esencial y publicá tu propiedad.',
  },
];

const getPropertyTypeLabel = (type: PropertyType) => {
  if (type === 'apartment') return 'Departamento';
  if (type === 'cabin') return 'Cabaña';
  return 'Casa';
};

const buildTitleSuggestion = (propertyType: PropertyType, zone: string, street: string) => {
  const typeLabel = getPropertyTypeLabel(propertyType);
  if (street.trim()) {
    return `${typeLabel} en ${zone} · ${street.trim()}`;
  }

  return `${typeLabel} en ${zone}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
};

const percentageForStep = (stepIndex: number) => Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

const buildPublishPayload = (data: {
  propertyType: PropertyType;
  zone: string;
  street: string;
  title: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  selectedFeatures: string[];
  coverImage: string;
  price: number;
  nightlyNotes: string;
  description: string;
}): PublishPayload => {
  const generatedTitle = data.title.trim() || buildTitleSuggestion(data.propertyType, data.zone, data.street);
  const location = data.street.trim() ? `${data.zone} · ${data.street.trim()}` : data.zone;
  const featureSummary = data.selectedFeatures.length > 0 ? `Incluye ${data.selectedFeatures.join(', ')}.` : 'Todavía podés sumar más detalles del equipamiento.';
  const notesSummary = data.nightlyNotes.trim() ? ` ${data.nightlyNotes.trim()}` : '';

  return {
    title: generatedTitle,
    location,
    price: data.price,
    imageUrl: data.coverImage.trim(),
    maxGuests: data.guests,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    propertyType: data.propertyType,
    description: `${data.description.trim()} ${featureSummary}${notesSummary}`.trim(),
  };
};

export const PropertyUploadForm: React.FC<PropertyUploadFormProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [propertyType, setPropertyType] = useState<PropertyType>('house');
  const [zone, setZone] = useState<typeof VALID_ZONES[number]>(VALID_ZONES[0]);
  const [street, setStreet] = useState('');
  const [title, setTitle] = useState('');
  const [guests, setGuests] = useState(2);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [photoNotes, setPhotoNotes] = useState<string[]>(['Frente o ingreso']);
  const [price, setPrice] = useState(95000);
  const [nightlyNotes, setNightlyNotes] = useState('');
  const [availabilityMode, setAvailabilityMode] = useState<'available-now' | 'custom' | 'review-before-confirm'>('available-now');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<Array<VerificationOption['key']>>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedPropertyTitle, setPublishedPropertyTitle] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const progress = percentageForStep(currentStepIndex);
  const remainingSteps = WIZARD_STEPS.slice(currentStepIndex + 1);
  const isLastStep = currentStep.id === 'summary';
  const generatedTitle = useMemo(
    () => buildTitleSuggestion(propertyType, zone, street),
    [propertyType, zone, street],
  );

  const publishPayload = useMemo(
    () => buildPublishPayload({
      propertyType,
      zone,
      street,
      title,
      guests,
      bedrooms,
      bathrooms,
      selectedFeatures,
      coverImage,
      price,
      nightlyNotes,
      description,
    }),
    [bathrooms, bedrooms, coverImage, description, guests, nightlyNotes, price, propertyType, selectedFeatures, street, title, zone],
  );

  const completionHighlights = useMemo(() => {
    const items = [
      { label: 'Tipo y ubicación', done: Boolean(zone && propertyType) },
      { label: 'Datos básicos', done: guests > 0 && bedrooms > 0 && bathrooms > 0 },
      { label: 'Fotos', done: Boolean(coverImage.trim()) },
      { label: 'Precio', done: price > 0 },
      { label: 'Disponibilidad', done: Boolean(availabilityMode) },
      { label: 'Verificación opcional', done: selectedVerification.length > 0 },
    ];

    return items;
  }, [availabilityMode, bathrooms, bedrooms, coverImage, guests, price, propertyType, selectedVerification.length, zone]);

  const missingHighlights = completionHighlights.filter((item) => !item.done).map((item) => item.label);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((current) => (
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]
    ));
  };

  const togglePhotoIdea = (idea: string) => {
    setPhotoNotes((current) => (
      current.includes(idea) ? current.filter((item) => item !== idea) : [...current, idea]
    ));
  };

  const toggleVerification = (key: VerificationOption['key']) => {
    setSelectedVerification((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  const getStepError = () => {
    switch (currentStep.id) {
      case 'type-location':
        if (!zone) return 'Elegí la zona de la propiedad para seguir.';
        return null;
      case 'basics':
        if (guests < 1) return 'Indicá al menos una persona de capacidad.';
        if (bedrooms < 1 || bathrooms < 1) return 'Completá ambientes y baños para seguir.';
        return null;
      case 'photos':
        if (!coverImage.trim()) return 'Sumá al menos una foto de portada o un link de imagen para publicar.';
        return null;
      case 'price':
        if (!Number.isFinite(price) || price <= 0) return 'Definí un precio por noche para seguir.';
        return null;
      case 'availability':
        if (availabilityMode === 'custom' && !availabilityNotes.trim()) return 'Contá brevemente cómo querés manejar la disponibilidad.';
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
      await apiJson('/api/properties', {
        method: 'POST',
        body: JSON.stringify(publishPayload),
        includeCredentials: true,
      });

      setPublishedPropertyTitle(publishPayload.title);
      setIsPublished(true);
      showToast('Publicación creada', 'Tu propiedad ya quedó publicada. Después podés seguir mejorándola.', 'success');
    } catch (error) {
      showToast('Publicación', error instanceof Error ? error.message : 'No pudimos crear la publicación.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isPublished) {
    return (
      <div className="mx-auto max-w-4xl px-4">
        <Card variant="elevated" padding="lg" className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_32px_80px_-42px_rgba(15,23,42,0.3)]">
          <div className="space-y-6">
            <Badge variant="success" size="md">
              <Icons.CheckCircle2 className="h-4 w-4" />
              Publicación creada
            </Badge>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{publishedPropertyTitle || 'Tu propiedad'} ya está publicada.</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                La primera versión ya quedó online. Ahora podés mejorarla con tiempo, sin frenar la publicación inicial.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card variant="muted" padding="md" className="space-y-2 border-slate-200/80 bg-white/85">
                <p className="text-sm font-semibold text-slate-900">Sumá más fotos</p>
                <p className="text-sm leading-6 text-slate-600">Mostrá ambientes, baño, exterior y detalles que hoy todavía no aparecen.</p>
              </Card>
              <Card variant="muted" padding="md" className="space-y-2 border-slate-200/80 bg-white/85">
                <p className="text-sm font-semibold text-slate-900">Agregá verificaciones</p>
                <p className="text-sm leading-6 text-slate-600">Identidad, ubicación y material real ayudan a responder menos dudas y a dar más confianza.</p>
              </Card>
              <Card variant="muted" padding="md" className="space-y-2 border-slate-200/80 bg-white/85">
                <p className="text-sm font-semibold text-slate-900">Ajustá precio y disponibilidad</p>
                <p className="text-sm leading-6 text-slate-600">Podés afinar la publicación con mejores horarios, reglas y condiciones más claras.</p>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onComplete}>
                <Icons.LayoutDashboard className="h-4 w-4" />
                Ir al panel
              </Button>
              <Button type="button" variant="secondary" onClick={onComplete}>
                <Icons.Home className="h-4 w-4" />
                Ver la publicación en contexto
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card padding="lg" className="space-y-5 border-slate-200/80 bg-white/96 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.3)]">
          <div className="space-y-3">
            <Badge variant="brand" size="md">
              <Icons.LayoutDashboard className="h-4 w-4" />
              Primer aviso
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Publicá tu propiedad paso a paso</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Un paso por pantalla, con lo mínimo para salir rápido y mejorar después.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Completitud</span>
              <span className="font-semibold text-brand">{progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-brand via-cyan-500 to-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500">{remainingSteps.length > 0 ? `${remainingSteps.length} pasos para publicar.` : 'Último paso antes de publicar.'}</p>
          </div>

          <div className="space-y-2.5">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isDone = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[20px] border px-3 py-3 transition-colors',
                    isActive
                      ? 'border-brand/20 bg-brand/5'
                      : isDone
                        ? 'border-emerald-200/80 bg-emerald-50/70'
                        : 'border-slate-200/80 bg-white/80',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-brand text-white'
                          : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {isDone ? <Icons.Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{step.shortTitle}</p>
                    <p className="text-xs text-slate-500">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <NoticeBanner
            tone="info"
            heading="Publicar rápido no te obliga a completar todo ahora."
            description="Las verificaciones y mejoras quedan visibles como próximos pasos, no como bloqueo."
          />
        </Card>
      </aside>

      <main className="space-y-5">
        <Card variant="elevated" padding="lg" className="border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_32px_80px_-42px_rgba(15,23,42,0.3)]">
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

            {currentStep.id === 'type-location' ? (
              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-3">
                  {PROPERTY_TYPES.map((item) => {
                    const Icon = Icons[item.icon];
                    const selected = propertyType === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setPropertyType(item.value)}
                        className={cn(
                          'rounded-[24px] border p-5 text-left transition-[border-color,background-color,transform,box-shadow] hover:-translate-y-px',
                          selected
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

                <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
                  <FormField label="Zona" htmlFor="property-zone">
                    <select
                      id="property-zone"
                      value={zone}
                      onChange={(event) => setZone(event.target.value as typeof VALID_ZONES[number])}
                      className="app-control w-full bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      {VALID_ZONES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </FormField>

                  <Input
                    id="property-street"
                    label="Ubicación dentro de la zona"
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    placeholder="Ej: Calle 35 entre 2 y 3"
                    helperText="No hace falta pedir todo el detalle ahora. Alcanzan referencias claras para arrancar."
                  />
                </div>

                <NoticeBanner
                  tone="info"
                  heading="Título sugerido"
                  description={title.trim() ? `Podés publicar como: ${title.trim()}` : `Si no escribís uno ahora, usamos: ${generatedTitle}`}
                />

                <Input
                  id="property-title"
                  label="Título del aviso"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={generatedTitle}
                  helperText="Opcional en este paso. Si querés, lo ajustás después."
                />
              </div>
            ) : null}

            {currentStep.id === 'basics' ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    id="property-guests"
                    label="Capacidad"
                    type="number"
                    min={1}
                    value={guests}
                    onChange={(event) => setGuests(Math.max(1, Number(event.target.value) || 1))}
                    helperText="Cuántas personas pueden quedarse cómodas."
                  />
                  <Input
                    id="property-bedrooms"
                    label="Ambientes para dormir"
                    type="number"
                    min={1}
                    value={bedrooms}
                    onChange={(event) => setBedrooms(Math.max(1, Number(event.target.value) || 1))}
                    helperText="Dormitorio o ambientes que se usan para dormir."
                  />
                  <Input
                    id="property-bathrooms"
                    label="Baños"
                    type="number"
                    min={1}
                    value={bathrooms}
                    onChange={(event) => setBathrooms(Math.max(1, Number(event.target.value) || 1))}
                    helperText="No hace falta más precisión ahora."
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Características principales</p>
                    <p className="text-sm text-slate-500">Elegí solo lo más importante para esta primera versión.</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {FEATURE_OPTIONS.map((feature) => {
                      const selected = selectedFeatures.includes(feature);

                      return (
                        <button
                          key={feature}
                          type="button"
                          onClick={() => toggleFeature(feature)}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                            selected
                              ? 'border-brand/20 bg-brand/10 text-brand'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                          )}
                        >
                          {feature}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FormField label="Descripción corta" htmlFor="property-description" helperText="Pensala como una primera impresión clara, no como una ficha completa.">
                  <textarea
                    id="property-description"
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="app-control min-h-[140px] w-full resize-none bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    placeholder="Ej: Lugar tranquilo, cerca del centro y cómodo para una escapada de fin de semana."
                  />
                </FormField>
              </div>
            ) : null}

            {currentStep.id === 'photos' ? (
              <div className="space-y-6">
                <Input
                  id="property-cover-image"
                  label="Foto principal"
                  value={coverImage}
                  onChange={(event) => setCoverImage(event.target.value)}
                  placeholder="Pegá una URL de imagen para la portada"
                  helperText="Para esta primera publicación alcanza una portada clara. Después podés sumar el resto."
                />

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                  <Card variant="muted" padding="lg" className="space-y-4 border-dashed border-slate-300 bg-slate-50/80">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-[var(--app-shadow-subtle)]">
                        <Icons.ImagePlus className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Qué conviene mostrar primero</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Elegí las fotos que querés sumar después para no perder de vista qué falta.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {PHOTO_IDEAS.map((idea) => {
                        const selected = photoNotes.includes(idea);
                        return (
                          <button
                            key={idea}
                            type="button"
                            onClick={() => togglePhotoIdea(idea)}
                            className={cn(
                              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                              selected
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                            )}
                          >
                            {idea}
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  <Card padding="lg" className="space-y-3 border-slate-200/80 bg-white/92">
                    <p className="text-sm font-semibold text-slate-900">Vista rápida</p>
                    <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-slate-100">
                      {coverImage.trim() ? (
                        <img src={coverImage.trim()} alt="Vista previa" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
                          <Icons.ImagePlus className="h-8 w-8" />
                          <p className="text-sm">Todavía no cargaste portada</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-6 text-slate-500">Con una buena foto principal ya podés publicar. El resto suma calidad, pero no te frena.</p>
                  </Card>
                </div>
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
                    helperText="Podés publicarlo ahora y ajustarlo cuando veas cómo responde la demanda."
                  />

                  <Card variant="muted" padding="lg" className="space-y-3 border-slate-200/80 bg-white/90">
                    <p className="text-sm font-semibold text-slate-900">Referencia rápida</p>
                    <p className="text-3xl font-semibold tracking-tight text-brand">{formatCurrency(price)}</p>
                    <p className="text-sm leading-6 text-slate-600">Mostramos un valor simple para que publiques rápido. Después podés ajustar por temporada, fines de semana o estadías largas.</p>
                  </Card>
                </div>

                <FormField label="Nota de precio opcional" htmlFor="property-price-note" helperText="Ej: incluye ropa blanca, el valor cambia en feriados o responde por semana.">
                  <textarea
                    id="property-price-note"
                    rows={4}
                    value={nightlyNotes}
                    onChange={(event) => setNightlyNotes(event.target.value)}
                    className="app-control min-h-[120px] w-full resize-none bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    placeholder="Contá si querés aclarar algo del valor, sin escribir una política completa."
                  />
                </FormField>
              </div>
            ) : null}

            {currentStep.id === 'availability' ? (
              <div className="space-y-4">
                {[
                  {
                    id: 'available-now' as const,
                    title: 'Disponible para recibir consultas ahora',
                    description: 'Publicás hoy y después ordenás el calendario con más detalle.',
                  },
                  {
                    id: 'review-before-confirm' as const,
                    title: 'Prefiero revisar cada consulta antes de confirmar',
                    description: 'Sirve si todavía estás afinando fechas o querés validar cada caso.',
                  },
                  {
                    id: 'custom' as const,
                    title: 'Quiero dejar una aclaración breve de disponibilidad',
                    description: 'Útil si ya sabés una condición puntual para esta temporada.',
                  },
                ].map((option) => {
                  const selected = availabilityMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAvailabilityMode(option.id)}
                      className={cn(
                        'w-full rounded-[24px] border p-5 text-left transition-colors',
                        selected
                          ? 'border-brand/20 bg-brand/5'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                        </div>
                        {selected ? <Icons.CheckCircle2 className="h-5 w-5 text-brand" /> : null}
                      </div>
                    </button>
                  );
                })}

                {availabilityMode === 'custom' ? (
                  <FormField label="Aclaración de disponibilidad" htmlFor="property-availability-note" helperText="Ej: disponible desde diciembre, consultas solo para estadías semanales o fechas a coordinar.">
                    <textarea
                      id="property-availability-note"
                      rows={4}
                      value={availabilityNotes}
                      onChange={(event) => setAvailabilityNotes(event.target.value)}
                      className="app-control min-h-[120px] w-full resize-none bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder="Contá brevemente qué querés aclarar sobre las fechas."
                    />
                  </FormField>
                ) : null}
              </div>
            ) : null}

            {currentStep.id === 'verification' ? (
              <div className="space-y-6">
                <NoticeBanner
                  tone="info"
                  heading="Estas mejoras son opcionales por ahora."
                  description="No te frenan la publicación. Las dejamos claras para que sepas cómo sumar comprobaciones con el tiempo, incluida la comprobación presencial desde el panel."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {VERIFICATION_OPTIONS.map((option) => {
                    const selected = selectedVerification.includes(option.key);
                    return (
                      <Card
                        key={option.key}
                        padding="lg"
                        className={cn(
                          'space-y-3 border transition-colors',
                          selected
                            ? 'border-brand/25 bg-brand/5'
                            : 'border-slate-200/80 bg-white/95',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleVerification(option.key)}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                              selected
                                ? 'border-brand/20 bg-brand text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                            )}
                          >
                            {selected ? 'Lo voy a sumar' : 'Anotarlo'}
                          </button>
                        </div>
                        <p className="text-xs leading-6 text-slate-500">{option.recommended}</p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {currentStep.id === 'summary' ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Tipo" value={getPropertyTypeLabel(propertyType)} />
                  <SummaryTile label="Ubicación" value={publishPayload.location} />
                  <SummaryTile label="Capacidad" value={`${guests} ${guests === 1 ? 'huésped' : 'huéspedes'}`} />
                  <SummaryTile label="Precio" value={formatCurrency(price)} />
                </div>

                <Card variant="muted" padding="lg" className="space-y-4 border-slate-200/80 bg-white/90">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Resumen claro antes de publicar</p>
                      <p className="mt-1 text-sm text-slate-500">Revisá lo principal y publicá. Después seguís mejorando el aviso desde el panel.</p>
                    </div>
                    <Badge variant="brand" size="md">{progress}% listo</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-slate-100">
                      {coverImage.trim() ? (
                        <img src={coverImage.trim()} alt={publishPayload.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <Icons.ImagePlus className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-900">{publishPayload.title}</h3>
                      <p className="text-sm leading-7 text-slate-600">{publishPayload.description || 'Todavía no agregaste una descripción larga.'}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeatures.length > 0 ? selectedFeatures.map((feature) => (
                          <Badge key={feature} variant="neutral" size="md">{feature}</Badge>
                        )) : <Badge variant="neutral" size="md">Sin características destacadas todavía</Badge>}
                      </div>
                    </div>
                  </div>
                </Card>

                <NoticeBanner
                  tone={missingHighlights.length === 0 ? 'success' : 'warning'}
                  heading={missingHighlights.length === 0 ? 'La base de la publicación ya quedó lista.' : 'Todavía te quedan mejoras opcionales para después de publicar.'}
                  description={missingHighlights.length === 0 ? 'Ya tenés cubierto lo esencial para salir rápido.' : `Más adelante podés reforzar: ${missingHighlights.join(', ')}.`}
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
                    Siguiente paso
                    <Icons.ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void handlePublish()} loading={isPublishing} loadingLabel="Publicando propiedad...">
                    <Icons.CheckCircle2 className="h-4 w-4" />
                    Publicar propiedad
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </main>
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
