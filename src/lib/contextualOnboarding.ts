export type ContextualOnboardingTrustLevel = 'presencial' | 'identity' | 'none';

export type ContextualOnboardingTip = {
  eyebrow: string;
  body: string;
  tone?: 'neutral' | 'brand' | 'success';
};

import {
  ONSITE_VALIDATION_CONTEXT_DISCLAIMER,
  PROTECTED_DEPOSIT_SCOPE_DISCLAIMER,
  PROTECTED_DEPOSIT_SCOPE_SUPPORT,
} from './uxDisclaimers';

type ContextualTrustItem = {
  key?: string | null;
  status?: string | null;
};

export const getContextualTrustLevelFromItems = (
  items?: ContextualTrustItem[] | null,
): ContextualOnboardingTrustLevel => {
  if (items?.some((item) => item.key === 'onsite' && item.status === 'complete')) {
    return 'presencial';
  }

  if (items?.some((item) => item.key === 'identity' && item.status === 'complete')) {
    return 'identity';
  }

  return 'none';
};

export const getGuestCardOnboardingTip = (
  trustLevel: ContextualOnboardingTrustLevel,
): ContextualOnboardingTip => {
  if (trustLevel === 'presencial') {
    return {
      eyebrow: 'Antes de decidir',
      body: `${ONSITE_VALIDATION_CONTEXT_DISCLAIMER} Precio, reglas y amenities los seguís revisando en la ficha.`,
      tone: 'success',
    };
  }

  if (trustLevel === 'identity') {
    return {
      eyebrow: 'Antes de decidir',
      body: 'La identidad de quien publica ya está validada. Abrí la ficha para revisar ubicación, fotos y reglas con más contexto.',
      tone: 'brand',
    };
  }

  return {
    eyebrow: 'Antes de decidir',
    body: 'Revisá quién publica, reseñas y reglas antes de reservar. La plataforma muestra contexto útil, pero la decisión final sigue siendo tuya.',
    tone: 'neutral',
  };
};

export const getGuestDetailOnboardingTip = (
  trustLevel: ContextualOnboardingTrustLevel,
): ContextualOnboardingTip => {
  if (trustLevel === 'presencial') {
    return {
      eyebrow: 'Qué ya podés entender',
      body: 'Acá ya ves identidad validada, ubicación confirmada y el alcance visible del aviso. Estado, calidad y amenities los terminás de chequear vos.',
      tone: 'success',
    };
  }

  if (trustLevel === 'identity') {
    return {
      eyebrow: 'Qué ya podés entender',
      body: 'La ficha ya muestra identidad validada del anfitrión. Ubicación, acceso y reglas conviene confirmarlos leyendo la publicación y preguntando por chat.',
      tone: 'brand',
    };
  }

  return {
    eyebrow: 'Qué revisar primero',
    body: 'Usá esta ficha para revisar quién publica, reglas, reseñas y fotos reales. La plataforma ordena información útil, no reemplaza tu criterio.',
    tone: 'neutral',
  };
};

export const getBookingFlowOnboardingTip = (): ContextualOnboardingTip => ({
  eyebrow: 'Antes de confirmar',
  body: `Si elegís Seña Protegida, la seña queda retenida hasta check-in. ${PROTECTED_DEPOSIT_SCOPE_DISCLAIMER}`,
  tone: 'brand',
});

export const getProtectedOperationOnboardingTip = (): ContextualOnboardingTip => ({
  eyebrow: 'Seña Protegida',
  body: `${PROTECTED_DEPOSIT_SCOPE_DISCLAIMER} ${PROTECTED_DEPOSIT_SCOPE_SUPPORT}`,
  tone: 'brand',
});

export const getGuestChatOnboardingTip = (
  trustLevel: ContextualOnboardingTrustLevel,
  mode: 'protected' | 'direct' | 'none',
): ContextualOnboardingTip => {
  if (mode === 'protected') {
    return {
      eyebrow: 'Cómo sigue por acá',
      body: `Este chat deja registro de lo acordado. ${PROTECTED_DEPOSIT_SCOPE_DISCLAIMER}`,
      tone: 'brand',
    };
  }

  if (trustLevel === 'presencial') {
    return {
      eyebrow: 'Qué ya sabés',
      body: 'Ya ves identidad validada y verificación presencial del aviso. Aprovechá el chat para cerrar dudas concretas sobre reglas, llegada y condiciones.',
      tone: 'success',
    };
  }

  if (trustLevel === 'identity') {
    return {
      eyebrow: 'Qué ya sabés',
      body: 'La identidad del anfitrión ya está validada. Usá este chat para confirmar ubicación, acceso, reglas y cualquier detalle antes de avanzar.',
      tone: 'brand',
    };
  }

  return {
    eyebrow: 'Qué conviene hacer',
    body: 'Usá el chat para aclarar reglas, llegada y condiciones. La plataforma acompaña la conversación, pero no reemplaza las preguntas clave antes de decidir.',
    tone: 'neutral',
  };
};

export const getHostPriorityActionTip = (actionId: string): string | null => {
  if (actionId === 'pending-requests') {
    return 'Responder rápido evita que la consulta se enfríe y también mejora la percepción de confianza del aviso.';
  }

  if (actionId === 'missing-verifications') {
    return 'Cada señal visible reduce dudas antes de la reserva. La verificación suma contexto; no reemplaza tu historial real.';
  }

  if (actionId === 'paused-property' || actionId === 'availability') {
    return 'La visibilidad mejora cuando el aviso está activo, claro y con disponibilidad al día.';
  }

  return null;
};

export const getHostVerificationOnboardingTip = (): ContextualOnboardingTip => ({
  eyebrow: 'Qué suma esta validación',
  body: 'La verificación presencial baja dudas antes de reservar, ordena mejores consultas y deja más claro quién publica sin tocar reglas ocultas.',
  tone: 'brand',
});