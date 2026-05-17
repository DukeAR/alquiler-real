export type OperationalPolicyItem = {
  title: string;
  description: string;
};

export const CONFLICT_REVIEW_POLICY_INTRO = 'Vamos a revisar la informacion disponible dentro de esta operacion.';

export const CONFLICT_REVIEW_POLICY_LIMIT_NOTE = 'No prometemos arbitraje absoluto, resolucion instantanea ni satisfaccion garantizada.';

export const CONFLICT_REVIEW_POLICY_OBJECTIVE = 'El objetivo es sostener un sistema consistente, escalable y alineado con los limites operativos reales de la plataforma.';

export const CONFLICT_REVIEW_INTERVENTION_CASES: OperationalPolicyItem[] = [
  {
    title: 'Propiedad inexistente',
    description: 'Cuando la operacion registrada indica que el inmueble no existe o no coincide con la publicacion de forma grave.',
  },
  {
    title: 'Imposibilidad de acceso',
    description: 'Si la reserva o el ingreso muestran que no hubo acceso real al inmueble dentro del flujo operativo.',
  },
  {
    title: 'Inconsistencias graves',
    description: 'Revisamos desvios claros entre publicacion, reserva, verificaciones y operacion real.',
  },
  {
    title: 'Seña Protegida',
    description: 'Intervenimos con mas alcance cuando la operacion sigue dentro de Seña Protegida y queda asentada en la app.',
  },
];

export const CONFLICT_REVIEW_OUT_OF_SCOPE_CASES: OperationalPolicyItem[] = [
  {
    title: 'Diferencias subjetivas',
    description: 'No resolvemos percepciones personales o evaluaciones subjetivas sin inconsistencia operativa clara.',
  },
  {
    title: 'Calidad percibida',
    description: 'La plataforma no arbitra preferencias sobre comodidad, gusto personal o calidad percibida.',
  },
  {
    title: 'Preferencias personales',
    description: 'No intervenimos por expectativas individuales que no quedaron comprometidas dentro del flujo.',
  },
  {
    title: 'Conflictos fuera de plataforma',
    description: 'Si el tramo principal del problema sucede por fuera de la app, el alcance de revision es limitado.',
  },
  {
    title: 'Acuerdos externos',
    description: 'Pagos, condiciones o compromisos cerrados por fuera de Alquiler Real no se revisan como parte del sistema interno.',
  },
];

export const CONFLICT_REVIEW_FLOW_STEPS: OperationalPolicyItem[] = [
  {
    title: 'Apertura de caso',
    description: 'El caso entra con el contexto disponible de reserva, publicacion, chat o ingreso.',
  },
  {
    title: 'Recopilacion operativa',
    description: 'Juntamos timestamps, estados, verificaciones, reportes y evidencias disponibles dentro del flujo.',
  },
  {
    title: 'Analisis de consistencia',
    description: 'Contrastamos lo publicado, lo operado y lo registrado para detectar inconsistencias reales.',
  },
  {
    title: 'Resolucion o escalamiento',
    description: 'Cerramos el caso con la informacion disponible o definimos el siguiente escalamiento interno.',
  },
];

export const CONFLICT_REVIEW_EVIDENCE_SOURCES: OperationalPolicyItem[] = [
  {
    title: 'Chat interno',
    description: 'Tomamos lo conversado cuando queda asentado dentro de la app.',
  },
  {
    title: 'Timestamps',
    description: 'Revisamos horarios de reserva, ingreso, reportes y cambios de estado.',
  },
  {
    title: 'Verificaciones',
    description: 'Sumamos identidad, ubicacion, acceso y validaciones disponibles segun el flujo.',
  },
  {
    title: 'Estados operativos',
    description: 'Usamos el estado real de la operacion, la seña y la solicitud vinculada.',
  },
  {
    title: 'Reportes y evidencias',
    description: 'Consideramos reportes, notas internas y respaldos disponibles sin asumir pruebas inexistentes.',
  },
];

export const CONFLICT_REVIEW_TRACEABILITY_FIELDS: OperationalPolicyItem[] = [
  {
    title: 'Historial de revision',
    description: 'Cada caso guarda aperturas, cambios de estado y movimientos relevantes.',
  },
  {
    title: 'Decisiones tomadas',
    description: 'Se registra el criterio operativo aplicado en cada avance del caso.',
  },
  {
    title: 'Operador interno',
    description: 'La trazabilidad deja identificado al operador que movio la revision.',
  },
  {
    title: 'Timestamps',
    description: 'Cada movimiento conserva fecha y hora para seguir la secuencia real.',
  },
];