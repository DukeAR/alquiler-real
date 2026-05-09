import type { ProtectedDepositPricing } from './protectedDeposit';

export const MARKETPLACE_MONETIZATION_CURRENCY = 'ARS' as const;

export const MARKETPLACE_MONETIZATION_PRIMARY_RANKING_SIGNALS = [
  'confianza',
  'reputacion',
  'operaciones_exitosas',
] as const;

export type MarketplaceMonetizationKey =
  | 'protected-operation'
  | 'documentary-verification'
  | 'onsite-verification'
  | 'professional-profile'
  | 'soft-boost';

export type MarketplaceMonetizationState = 'available' | 'active' | 'planned';

export type MarketplaceMonetizationPriceModel = 'fixed' | 'percentage';

export type MarketplaceMonetizationFeatureState = 'included' | 'coming_soon';

export type MarketplaceMonetizationScheduleState =
  | 'not_requested'
  | 'pending_schedule'
  | 'scheduled'
  | 'completed'
  | 'coming_soon';

export type MarketplaceMonetizationRankingPolicy = {
  primarySignals: readonly string[];
  monetizationInfluence: 'secondary_only';
  replacesInternalScore: false;
  sponsorLabelVisible: false;
};

export const MARKETPLACE_MONETIZATION_RANKING_POLICY: MarketplaceMonetizationRankingPolicy = {
  primarySignals: [...MARKETPLACE_MONETIZATION_PRIMARY_RANKING_SIGNALS],
  monetizationInfluence: 'secondary_only',
  replacesInternalScore: false,
  sponsorLabelVisible: false,
};

export type MarketplaceMonetizationPriceSummary = {
  label: string;
  model: MarketplaceMonetizationPriceModel;
  amountArs: number;
  currency: typeof MARKETPLACE_MONETIZATION_CURRENCY;
  percentageRate?: number | null;
  detail?: string | null;
  isComplimentary?: boolean;
  complimentaryReason?: string | null;
};

export type MarketplaceMonetizationFeaturePreview = {
  key: string;
  label: string;
  description: string;
  state: MarketplaceMonetizationFeatureState;
};

export type MarketplaceMonetizationScheduleSummary = {
  state: MarketplaceMonetizationScheduleState;
  label: string;
  detail: string;
  nextDate?: string | null;
};

export type MarketplaceMonetizationRenewalSummary = {
  optional: boolean;
  label: string;
  detail: string;
};

export type MarketplaceMonetizationPlan = {
  key: MarketplaceMonetizationKey;
  title: string;
  summary: string;
  state: MarketplaceMonetizationState;
  stateLabel: string;
  price: MarketplaceMonetizationPriceSummary | null;
  rankingPolicy: MarketplaceMonetizationRankingPolicy;
  featurePreview: MarketplaceMonetizationFeaturePreview[];
  note?: string;
  schedule?: MarketplaceMonetizationScheduleSummary | null;
  renewal?: MarketplaceMonetizationRenewalSummary | null;
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: MARKETPLACE_MONETIZATION_CURRENCY,
  maximumFractionDigits: 0,
});

export const formatMarketplaceMonetizationPriceLabel = (price: MarketplaceMonetizationPriceSummary | null) => {
  if (!price) {
    return null;
  }

  if (price.isComplimentary) {
    return 'Gratis por lanzamiento';
  }

  return currencyFormatter.format(price.amountArs);
};

export const buildMarketplaceMonetizationPrice = (input: {
  label: string;
  amountArs: number;
  model: MarketplaceMonetizationPriceModel;
  percentageRate?: number | null;
  detail?: string | null;
  isComplimentary?: boolean;
  complimentaryReason?: string | null;
}): MarketplaceMonetizationPriceSummary => ({
  label: input.label,
  model: input.model,
  amountArs: Math.max(0, Math.round(input.amountArs)),
  currency: MARKETPLACE_MONETIZATION_CURRENCY,
  ...(typeof input.percentageRate === 'number' ? { percentageRate: input.percentageRate } : {}),
  ...(input.detail ? { detail: input.detail } : {}),
  ...(input.isComplimentary ? { isComplimentary: true } : {}),
  ...(input.complimentaryReason ? { complimentaryReason: input.complimentaryReason } : {}),
});

export const buildProtectedOperationMonetizationPlan = (
  pricing: ProtectedDepositPricing | null,
): MarketplaceMonetizationPlan | null => {
  if (!pricing) {
    return null;
  }

  return {
    key: 'protected-operation',
    title: 'Seña Protegida',
    summary: 'Protege la seña reteniéndola hasta check-in y deja trazabilidad si la operación necesita revisión manual.',
    state: 'available',
    stateLabel: 'Disponible antes de confirmar',
    price: buildMarketplaceMonetizationPrice({
      label: 'Costo por protección de operación',
      amountArs: pricing.serviceFee,
      model: pricing.feeRate > 0 ? 'percentage' : 'fixed',
      percentageRate: pricing.feeRate > 0 ? pricing.feeRate : null,
      detail: pricing.feeRate > 0
        ? `${Math.round(pricing.feeRate * 100)}% sobre la seña protegida.`
        : 'Se suma como cargo fijo cuando elegís esta modalidad.',
    }),
    rankingPolicy: MARKETPLACE_MONETIZATION_RANKING_POLICY,
    featurePreview: [
      {
        key: 'custody',
        label: 'Retención hasta check-in',
        description: 'La seña queda dentro del flujo protegido hasta que se confirma acceso o se deriva a revisión manual.',
        state: 'included',
      },
      {
        key: 'traceability',
        label: 'Trazabilidad operativa',
        description: 'La operación queda asentada con referencia, confirmaciones y contexto de chat.',
        state: 'included',
      },
      {
        key: 'manual-review',
        label: 'Revisión manual si hace falta',
        description: 'Si hay conflicto sobre existencia o acceso, el flujo pasa a revisión sin salir de la plataforma.',
        state: 'included',
      },
    ],
    note: 'Solo aplica cuando elegís Seña Protegida y se muestra antes de confirmar.',
  };
};

export const buildVerificationMonetizationPlan = (input: {
  key: 'documentary-verification' | 'onsite-verification';
  title: string;
  summary: string;
  priceArs: number;
  isComplimentary: boolean;
  complimentaryReason?: string | null;
  state: MarketplaceMonetizationState;
  stateLabel: string;
  featurePreview: MarketplaceMonetizationFeaturePreview[];
  note?: string;
  schedule?: MarketplaceMonetizationScheduleSummary | null;
  renewal?: MarketplaceMonetizationRenewalSummary | null;
}) : MarketplaceMonetizationPlan => ({
  key: input.key,
  title: input.title,
  summary: input.summary,
  state: input.state,
  stateLabel: input.stateLabel,
  price: buildMarketplaceMonetizationPrice({
    label: input.key === 'onsite-verification'
      ? 'Costo del servicio de verificación presencial'
      : 'Costo de validación adicional',
    amountArs: input.priceArs,
    model: 'fixed',
    detail: input.key === 'onsite-verification'
      ? 'Se confirma antes de coordinar la visita.'
      : 'Se confirma antes de avanzar con la validación documental.',
    isComplimentary: input.isComplimentary,
    complimentaryReason: input.complimentaryReason ?? null,
  }),
  rankingPolicy: MARKETPLACE_MONETIZATION_RANKING_POLICY,
  featurePreview: input.featurePreview,
  ...(input.note ? { note: input.note } : {}),
  ...(input.schedule ? { schedule: input.schedule } : {}),
  ...(input.renewal ? { renewal: input.renewal } : {}),
});

export const buildProfessionalProfileMonetizationPlan = (): MarketplaceMonetizationPlan => ({
  key: 'professional-profile',
  title: 'Perfil profesional',
  summary: 'Prepara una capa futura para operar varias propiedades con mejor lectura del negocio, sin tocar tu reputación visible.',
  state: 'planned',
  stateLabel: 'Próximamente',
  price: null,
  rankingPolicy: MARKETPLACE_MONETIZATION_RANKING_POLICY,
  featurePreview: [
    {
      key: 'analytics',
      label: 'Analytics simples',
      description: 'Embudo, consultas y conversión para entender dónde se cae cada operación.',
      state: 'coming_soon',
    },
    {
      key: 'multi-property',
      label: 'Gestión multi-propiedad',
      description: 'Una misma vista para revisar disponibilidad, solicitudes y seguimiento de varios avisos.',
      state: 'coming_soon',
    },
    {
      key: 'advanced-tools',
      label: 'Herramientas avanzadas',
      description: 'Atajos operativos y más control sin reemplazar las señales reales de confianza.',
      state: 'coming_soon',
    },
  ],
  note: 'Es una estructura futura: no activa funciones complejas todavía ni altera el score interno.',
});

export const buildSoftBoostMonetizationPlan = (): MarketplaceMonetizationPlan => ({
  key: 'soft-boost',
  title: 'Mayor exposición temporal',
  summary: 'Reserva una ventana futura de exposición suave para acompañar avisos sanos, sin desplazar el orden principal del marketplace.',
  state: 'planned',
  stateLabel: 'Próximamente',
  price: null,
  rankingPolicy: MARKETPLACE_MONETIZATION_RANKING_POLICY,
  featurePreview: [
    {
      key: 'temporary-window',
      label: 'Ventanas temporales',
      description: 'La exposición extra tendría duración limitada, no permanente.',
      state: 'coming_soon',
    },
    {
      key: 'secondary-placement',
      label: 'Influencia secundaria',
      description: 'Solo puede acompañar el orden principal basado en confianza, reputación y operaciones exitosas.',
      state: 'coming_soon',
    },
    {
      key: 'quiet-ux',
      label: 'Sin estética publicitaria',
      description: 'No usa sponsor visible ni reemplaza señales reales dentro de la ficha.',
      state: 'coming_soon',
    },
  ],
  note: 'La estructura deja explícito que la monetización no reemplaza el ranking interno ni muestra avisos patrocinados.',
});