import { useEffect, useMemo, useRef, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import { PRESENCIAL_VERIFICATION_LABEL, PRESENCIAL_VERIFICATION_LEVEL_LABEL, getPropertyVerificationItems } from '../../lib/propertyVerification';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import type { Property } from '../../types';
import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VerificationSeal } from '../ui/VerificationSeal';

type HostProgressKey = 'identity' | 'location' | 'geolocation' | 'photos' | 'availability';

type HostListingProgressPanelProps = {
  property: Property;
  className?: string;
  onRefresh?: () => Promise<void> | void;
  onOpenIdentityVerification?: () => void;
  onToggleAvailability?: () => void;
  isAvailabilityOpen?: boolean;
};

type VerificationUploadKind = 'photo';

type OrderedProgressItem = {
  key: HostProgressKey;
  label: string;
  description: string;
  status: 'complete' | 'pending';
};

const CHECK_ORDER: HostProgressKey[] = ['identity', 'location', 'geolocation', 'photos', 'availability'];

const uploadAcceptMap: Record<VerificationUploadKind, string> = {
  photo: 'image/*',
};

const impactByKey: Record<HostProgressKey, string> = {
  identity: 'Da más claridad sobre quién publica el aviso.',
  location: 'Hace que el aviso se entienda más rápido cuando comparan opciones.',
  geolocation: 'Ayuda a ubicar mejor la propiedad cuando comparan opciones.',
  photos: 'Suma respaldo visual y aclara mejor el aviso antes de abrir chat.',
  availability: 'Hace más probable que la consulta avance sin fricción.',
};

const HOST_PROGRESS_LABELS: Record<HostProgressKey, string> = {
  identity: 'Identidad del anfitrión validada en la plataforma',
  location: 'Ubicación del aviso cargada',
  geolocation: 'Punto exacto del aviso',
  photos: 'Respaldo visual del aviso',
  availability: 'Disponibilidad reciente',
};

const getHostProgressDescription = (key: HostProgressKey, status: 'complete' | 'pending') => {
  switch (key) {
    case 'identity':
      return status === 'complete'
        ? 'La identidad del anfitrión ya quedó validada dentro de la plataforma.'
        : 'Todavía falta validar la identidad del anfitrión dentro de la plataforma.';
    case 'location':
      return status === 'complete'
        ? 'La ubicación del aviso ya quedó cargada dentro de la plataforma.'
        : 'Todavía falta cargar la ubicación del aviso.';
    case 'geolocation':
      return status === 'complete'
        ? 'El aviso ya tiene un punto de mapa para ubicar mejor la propiedad.'
        : 'Todavía falta sumar el punto exacto del mapa para ubicar mejor la propiedad.';
    case 'photos':
      return status === 'complete'
        ? 'El aviso ya cuenta con fotos del lugar como respaldo visual.'
        : 'Todavía falta sumar fotos del lugar como respaldo visual.';
    case 'availability':
      return status === 'complete'
        ? 'La disponibilidad ya muestra calendario o actividad reciente.'
        : 'Todavía falta confirmar disponibilidad reciente.';
    default:
      return '';
  }
};

const getTopMessage = (pendingKeys: Set<HostProgressKey>) => {
  if (pendingKeys.size === 0) {
    return 'Tu aviso ya tiene lo necesario para sostenerse entre los primeros resultados.';
  }

  if (pendingKeys.has('photos')) {
    return 'Te falta sumar respaldo visual para aparecer entre los primeros resultados.';
  }

  if (pendingKeys.has('availability')) {
    return 'Te falta confirmar disponibilidad para aparecer entre los primeros resultados.';
  }

  if (pendingKeys.has('location') || pendingKeys.has('geolocation')) {
    return 'Te falta completar la ubicación para aparecer entre los primeros resultados.';
  }

  if (pendingKeys.has('identity')) {
    return 'Te falta validar tu identidad para aparecer entre los primeros resultados.';
  }

  return 'Te falta completar un paso clave para aparecer entre los primeros resultados.';
};

const normalizeProgressKey = (key: string): HostProgressKey | null => {
  if (key === 'identity' || key === 'location' || key === 'geolocation' || key === 'photos' || key === 'availability') {
    return key;
  }

  return null;
};

const parseOptionalCoordinate = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue.replace(',', '.'));

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getGeolocationErrorMessage = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'No pudimos usar tu ubicación actual porque el permiso fue denegado.';
    case error.POSITION_UNAVAILABLE:
      return 'No pudimos obtener la ubicación actual desde este dispositivo.';
    case error.TIMEOUT:
      return 'La búsqueda de ubicación tardó demasiado. Probá de nuevo.';
    default:
      return 'No pudimos obtener la ubicación actual.';
  }
};

export const HostListingProgressPanel = ({
  property,
  className,
  onRefresh,
  onOpenIdentityVerification,
  onToggleAvailability,
  isAvailabilityOpen = false,
}: HostListingProgressPanelProps) => {
  const [uploadingKind, setUploadingKind] = useState<VerificationUploadKind | null>(null);
  const [isLocationEditorOpen, setIsLocationEditorOpen] = useState(false);
  const [locationValue, setLocationValue] = useState(property.location ?? '');
  const [latValue, setLatValue] = useState(typeof property.lat === 'number' ? property.lat.toFixed(6) : '');
  const [lngValue, setLngValue] = useState(typeof property.lng === 'number' ? property.lng.toFixed(6) : '');
  const [savingLocation, setSavingLocation] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocationValue(property.location ?? '');
    setLatValue(typeof property.lat === 'number' ? property.lat.toFixed(6) : '');
    setLngValue(typeof property.lng === 'number' ? property.lng.toFixed(6) : '');
  }, [property.id, property.location, property.lat, property.lng]);

  const verificationItems = useMemo(() => (
    getPropertyVerificationItems(property)
      .map((item) => {
        const key = normalizeProgressKey(typeof item.key === 'string' ? item.key : '');

        if (!key) {
          return null;
        }

        return {
          key,
          label: HOST_PROGRESS_LABELS[key],
          description: getHostProgressDescription(key, item.status),
          status: item.status,
        } satisfies OrderedProgressItem;
      })
      .filter((item): item is OrderedProgressItem => item !== null)
      .sort((left, right) => CHECK_ORDER.indexOf(left.key) - CHECK_ORDER.indexOf(right.key))
  ), [property]);

  const isPresencialVerified = Boolean(property.hasPresencialVerification || property.onsiteVerifiedAt);
  const score = verificationItems.filter((item) => item.status === 'complete').length;
  const maxScore = verificationItems.length;
  const visibleSealTitle = isPresencialVerified ? PRESENCIAL_VERIFICATION_LEVEL_LABEL : 'Pasos de respaldo del aviso';
  const visibleSealLabel = isPresencialVerified ? PRESENCIAL_VERIFICATION_LABEL : 'Pasos de respaldo';
  const visibleSealDescription = isPresencialVerified
    ? 'Confirmamos identidad, acceso, vínculo y ubicación durante una visita presencial.'
    : 'Estos pasos internos ayudan a ordenar y respaldar tu publicación antes de solicitar la visita presencial.';
  const pendingKeys = new Set(
    verificationItems
      .filter((item) => item.status !== 'complete')
      .map((item) => item.key),
  );
  const topMessage = getTopMessage(pendingKeys);
  const locationActionDisabled = savingLocation || resolvingLocation;

  const uploadFiles = async (kind: VerificationUploadKind, fileList: FileList | null) => {
    if (!property.id || !fileList || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);
    const formData = new FormData();
    formData.append('assetKind', kind);
    files.forEach((file) => formData.append('files', file));

    setUploadingKind(kind);

    try {
      await apiJson(`/api/properties/${property.id}/verification/assets`, {
        method: 'POST',
        body: formData,
      });

      await onRefresh?.();
      showToast(
        'Material real',
        files.length === 1
          ? 'La foto ya suma respaldo visual en el aviso.'
          : 'Las fotos ya suman respaldo visual en el aviso.',
        'success',
      );
    } catch (error: any) {
      showToast('Material real', error?.message || 'No pudimos subir las fotos.', 'error');
    } finally {
      setUploadingKind(null);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Ubicación', 'Tu navegador no permite obtener la ubicación actual.', 'warning');
      return;
    }

    setResolvingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatValue(position.coords.latitude.toFixed(6));
        setLngValue(position.coords.longitude.toFixed(6));
        setResolvingLocation(false);
      },
      (error) => {
        setResolvingLocation(false);
        showToast('Ubicación', getGeolocationErrorMessage(error), 'warning');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const handleSaveLocation = async () => {
    const trimmedLocation = locationValue.trim();
    const parsedLat = parseOptionalCoordinate(latValue);
    const parsedLng = parseOptionalCoordinate(lngValue);

    if (!trimmedLocation) {
      showToast('Ubicación', 'Completá la zona o barrio antes de guardar.', 'warning');
      return;
    }

    if (parsedLat === null || parsedLng === null) {
      showToast('Ubicación', 'Revisá latitud y longitud antes de guardar.', 'warning');
      return;
    }

    if ((parsedLat === undefined) !== (parsedLng === undefined)) {
      showToast('Ubicación', 'Sumá latitud y longitud juntas para marcar el punto exacto.', 'warning');
      return;
    }

    setSavingLocation(true);

    try {
      const body: Record<string, unknown> = {
        location: trimmedLocation,
        locationVerified: true,
      };

      if (parsedLat !== undefined && parsedLng !== undefined) {
        body.lat = parsedLat;
        body.lng = parsedLng;
      }

      await apiJson(`/api/properties/${property.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      await onRefresh?.();
      setIsLocationEditorOpen(false);
      showToast(
        'Ubicación actualizada',
        parsedLat !== undefined && parsedLng !== undefined
          ? 'La ubicación y el punto exacto ya quedaron guardados.'
          : 'La ubicación ya quedó guardada. Si querés sumar precisión, agregá latitud y longitud.',
        'success',
      );
    } catch (error) {
      showToast('Ubicación', error instanceof Error ? error.message : 'No pudimos guardar la ubicación.', 'error');
    } finally {
      setSavingLocation(false);
    }
  };

  const renderAction = (item: OrderedProgressItem) => {
    if (item.status === 'complete') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-700">
          <Icons.Check className="h-3.5 w-3.5" />
          Listo
        </span>
      );
    }

    if (item.key === 'photos') {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={() => photoInputRef.current?.click()}
          loading={uploadingKind === 'photo'}
          loadingLabel="Subiendo fotos..."
        >
          <>
            <Icons.ImagePlus className="h-4 w-4" />
            Subir fotos
          </>
        </Button>
      );
    }

    if (item.key === 'availability' && onToggleAvailability) {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={onToggleAvailability}
        >
          <>
            <Icons.Calendar className="h-4 w-4" />
            {isAvailabilityOpen ? 'Ocultar disponibilidad' : 'Confirmar disponibilidad'}
          </>
        </Button>
      );
    }

    if (item.key === 'location' || item.key === 'geolocation') {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={() => setIsLocationEditorOpen(true)}
          disabled={locationActionDisabled}
        >
          <>
            <Icons.MapPin className="h-4 w-4" />
            {item.key === 'geolocation' ? 'Precisar ubicación' : 'Completar ubicación'}
          </>
        </Button>
      );
    }

    if (item.key === 'identity' && onOpenIdentityVerification) {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={onOpenIdentityVerification}
        >
          <>
            <Icons.ShieldCheck className="h-4 w-4" />
            Validar identidad
          </>
        </Button>
      );
    }

    return null;
  };

  return (
    <div className={cn('rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.2)]', className)}>
      <input
        ref={photoInputRef}
        aria-label="Subir fotos de respaldo"
        type="file"
        accept={uploadAcceptMap.photo}
        multiple
        className="hidden"
        onChange={(event) => void uploadFiles('photo', event.target.files)}
      />

      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Estado de tu aviso</p>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{visibleSealTitle}</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{topMessage}</p>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Sello visible</p>
            <VerificationSeal
              score={score}
              maxScore={maxScore}
              label={visibleSealLabel}
              description={visibleSealDescription}
              size="md"
              showCount={false}
              ariaLabel={visibleSealTitle}
              className="mt-3"
            />
          </div>
        </div>

        <div className="space-y-3">
          {verificationItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                'grid gap-4 rounded-[22px] border px-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center',
                item.status === 'complete'
                  ? 'border-emerald-200/80 bg-white/92'
                  : 'border-slate-200/80 bg-white/96',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-2xl border',
                  item.status === 'complete'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                  {item.status === 'complete' ? <Icons.Check className="h-5 w-5" /> : <span className="text-base font-semibold">⚠</span>}
              </span>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                    item.status === 'complete'
                      ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700',
                  )}>
                      {item.status === 'complete' ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                <p className="text-xs font-medium leading-5 text-slate-500">Impacto real: {impactByKey[item.key]}</p>
              </div>

              <div className="flex items-center lg:justify-end">
                {renderAction(item)}
              </div>
            </div>
          ))}
        </div>

        {isLocationEditorOpen ? (
          <div className="rounded-[24px] border border-slate-200/80 bg-white/96 p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Completar ubicación</p>
              <p className="text-sm leading-6 text-slate-600">Guardá la zona del aviso y, si podés, sumá el punto exacto para ubicar mejor la propiedad.</p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                label="Zona o barrio"
                value={locationValue}
                onChange={(event) => setLocationValue(event.target.value)}
                placeholder="Ej. Pinamar norte"
              />
              <Input
                label="Latitud"
                value={latValue}
                onChange={(event) => setLatValue(event.target.value)}
                placeholder="-37.112233"
              />
              <Input
                label="Longitud"
                value={lngValue}
                onChange={(event) => setLngValue(event.target.value)}
                placeholder="-56.778899"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={handleUseCurrentLocation}
                loading={resolvingLocation}
                loadingLabel="Buscando ubicación..."
              >
                <>
                  <Icons.Navigation className="h-4 w-4" />
                  Usar mi ubicación actual
                </>
              </Button>

              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => void handleSaveLocation()}
                loading={savingLocation}
                loadingLabel="Guardando ubicación..."
              >
                <>
                  <Icons.CheckCircle2 className="h-4 w-4" />
                  Guardar ubicación
                </>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setIsLocationEditorOpen(false)}
                disabled={savingLocation || resolvingLocation}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4">
          <p className="text-sm font-semibold text-slate-950">Cómo impacta en tu publicación</p>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 md:grid-cols-2">
            <div className="rounded-[18px] bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-900">Más completo</span>
              {' -> '}más visibilidad
            </div>
            <div className="rounded-[18px] bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-900">Más claro</span>
              {' -> '}más consultas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostListingProgressPanel;