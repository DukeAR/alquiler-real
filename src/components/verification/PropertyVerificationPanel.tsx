import React, { useRef, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import {
  getPropertyAdvancedVerificationItems,
  getPropertyVerificationBadge,
  getPropertyVerificationDetails,
  getPropertyVerificationItems,
} from '../../lib/propertyVerification';
import { VERIFICATION_PRIVACY_NOTICES } from '../../lib/privacyPolicy';
import { PLATFORM_PROPERTY_DISCLAIMER } from '../../lib/platformTerms';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import type { Property, VerificationAsset } from '../../types';
import HostAvailabilityPanel from '../HostAvailabilityPanel';
import { Icons } from '../Icons';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PropertyVerificationChecklist } from '../ui/PropertyVerificationChecklist';
import { VerificationSeal } from '../ui/VerificationSeal';
import { HostListingProgressPanel } from './HostListingProgressPanel';

type VerificationUploadKind = 'video' | 'document';

type PropertyVerificationPanelProps = {
  property: Property;
  className?: string;
  onRefresh?: () => Promise<void> | void;
  onOpenIdentityVerification?: () => void;
};

const uploadAcceptMap: Record<VerificationUploadKind, string> = {
  video: 'video/*',
  document: 'application/pdf,image/*',
};

const AssetPreviewStrip = ({
  title,
  assets,
  emptyText,
  icon,
}: {
  title: string;
  assets: VerificationAsset[];
  emptyText: string;
  icon: React.ReactNode;
}) => {
  if (assets.length === 0) {
    return (
      <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          <span>{title}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        <span>{title}</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {assets.slice(0, 4).map((asset) => (
          <a
            key={asset.id}
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300"
          >
            {asset.fileType === 'image' ? (
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.originalName || title}
                className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-950 text-white">
                {asset.fileType === 'video' ? <Icons.Video className="h-9 w-9" /> : <Icons.FileText className="h-9 w-9" />}
              </div>
            )}

            <div className="space-y-1 px-3 py-3">
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{asset.originalName || 'Archivo cargado'}</p>
              <p className="text-xs text-slate-500">Abrir archivo</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export const PropertyVerificationPanel = ({
  property,
  className,
  onRefresh,
  onOpenIdentityVerification,
}: PropertyVerificationPanelProps) => {
  const [uploadingKind, setUploadingKind] = useState<VerificationUploadKind | null>(null);
  const [availabilityExpanded, setAvailabilityExpanded] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const verificationItems = getPropertyVerificationItems(property);
  const verificationBadge = getPropertyVerificationBadge({ ...property, verificationItems });
  const verificationDetails = getPropertyVerificationDetails({ ...property, verificationItems });
  const advancedItems = getPropertyAdvancedVerificationItems(property);
  const pendingItems = verificationItems.filter((item) => item.status !== 'complete');
  const photoAssets = Array.isArray(property.verificationMedia?.photos) ? property.verificationMedia.photos : [];
  const videoAsset = property.verificationMedia?.video ?? null;
  const documentAssets = Array.isArray(property.verificationMedia?.documents) ? property.verificationMedia.documents : [];
  const ownerView = property.isOwnedByViewer === true;

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
        'Validacion del aviso',
        kind === 'video'
            ? 'El video ya quedo cargado como respaldo fuerte del aviso.'
            : 'La documentacion privada ya quedo cargada para revision interna.',
        'success',
      );
    } catch (error: any) {
      showToast('Validacion del aviso', error?.message || 'No pudimos guardar estos archivos.', 'error');
    } finally {
      setUploadingKind(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  if (!ownerView) {
    return (
      <Card className={cn('rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7', className)}>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lectura del aviso</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{verificationBadge.summaryLabel}</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">Estas son las 5 comprobaciones visibles que usamos para mostrar qué parte del aviso ya está validada y qué sigue pendiente.</p>
          </div>

          <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4">
            <VerificationSeal
              score={verificationDetails.score}
              maxScore={verificationDetails.max}
              label={verificationDetails.compactLabel}
              description={verificationDetails.description}
              size="md"
              ariaLabel={verificationDetails.summaryLabel}
            />
            <PropertyVerificationChecklist items={verificationDetails.items} size="md" columns={2} />
          </div>

          {pendingItems.length > 0 ? (
            <p className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600">
              Falta completar: {pendingItems.map((item) => item.label).join(' · ')}.
            </p>
          ) : null}

          <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
            {PLATFORM_PROPERTY_DISCLAIMER}
          </div>

          {videoAsset ? (
            <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-950 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white/90">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icons.Video className="h-4 w-4" />
                  <span>Video del lugar</span>
                </div>
                <Badge variant="neutral" size="sm" className="border-white/15 bg-white/10 text-white">
                  Respaldo visual
                </Badge>
              </div>
              <video
                controls
                preload="metadata"
                src={videoAsset.url}
                poster={videoAsset.thumbnailUrl || undefined}
                className="aspect-video w-full bg-slate-950"
              />
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7', className)}>
      <input
        ref={videoInputRef}
        type="file"
        accept={uploadAcceptMap.video}
        className="hidden"
        onChange={(event) => void uploadFiles('video', event.target.files)}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept={uploadAcceptMap.document}
        multiple
        className="hidden"
        onChange={(event) => void uploadFiles('document', event.target.files)}
      />

      <div className="space-y-6">
        <HostListingProgressPanel
          property={property}
          onRefresh={onRefresh}
          onOpenIdentityVerification={onOpenIdentityVerification}
          onToggleAvailability={() => setAvailabilityExpanded((currentValue) => !currentValue)}
          isAvailabilityOpen={availabilityExpanded}
        />

        {availabilityExpanded ? (
          <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-4">
            <HostAvailabilityPanel propertyId={property.id} propertyTitle={property.title} />
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Acciones complementarias</p>
                <p className="text-sm leading-6 text-slate-600">Además del progreso visible, desde acá podés sumar video real y respaldo privado para revisión interna.</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingKind !== null}
                >
                  <>
                    <Icons.Video className="h-4 w-4" />
                    {uploadingKind === 'video' ? 'Subiendo video...' : 'Subir video del lugar'}
                  </>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={uploadingKind !== null}
                >
                  <>
                    <Icons.Lock className="h-4 w-4" />
                    {uploadingKind === 'document' ? 'Guardando documentos...' : 'Cargar documentos privados'}
                  </>
                </Button>
              </div>
            </div>

            <AssetPreviewStrip
              title="Fotos de comprobacion"
              assets={photoAssets}
              emptyText="Cuando cargues fotos reales desde aca, aparecen como respaldo visible del aviso."
              icon={<Icons.ImagePlus className="h-4 w-4 text-brand" />}
            />

            <AssetPreviewStrip
              title="Documentacion privada"
              assets={documentAssets}
              emptyText={VERIFICATION_PRIVACY_NOTICES.propertyDocuments}
              icon={<Icons.Lock className="h-4 w-4 text-slate-500" />}
            />

            {videoAsset ? (
              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-950 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.45)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white/90">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icons.Video className="h-4 w-4" />
                    <span>Video cargado</span>
                  </div>
                  <Badge variant="neutral" size="sm" className="border-white/15 bg-white/10 text-white">
                    Senal fuerte
                  </Badge>
                </div>
                <video
                  controls
                  preload="metadata"
                  src={videoAsset.url}
                  poster={videoAsset.thumbnailUrl || undefined}
                  className="aspect-video w-full bg-slate-950"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Icons.Sparkles className="h-4 w-4 text-brand" />
                <span>Capa avanzada</span>
              </div>

              <ul className="mt-4 space-y-3">
                {advancedItems.map((item) => (
                  <li key={item.key} className="flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3">
                    <span className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm',
                      item.status === 'complete'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500',
                    )}>
                      {item.status === 'complete' ? '✔' : '○'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PropertyVerificationPanel;