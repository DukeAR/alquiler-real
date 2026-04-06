export type PropertyVerificationStatus = 'complete' | 'pending';

export const REAL_VERIFICATION_FILTER_MIN_SCORE = 3;

export interface PropertyVerificationItem {
  key: 'identity' | 'location' | 'visual' | 'relationship' | 'onsite';
  label: string;
  description: string;
  status: PropertyVerificationStatus;
}

type PropertyVerificationSource = {
  identityValidated?: boolean;
  locationVerified?: boolean;
  videoValidated?: boolean;
  propertyRelationshipVerified?: boolean;
  hasPresencialVerification?: boolean;
};

export const buildPropertyVerification = (property: PropertyVerificationSource) => {
  const verificationItems: PropertyVerificationItem[] = [
    {
      key: 'identity',
      label: 'Identidad confirmada',
      description: property.identityValidated ? 'Sabés con quién estás hablando.' : 'Falta confirmar quién publica.',
      status: property.identityValidated ? 'complete' : 'pending',
    },
    {
      key: 'location',
      label: 'Ubicación verificada',
      description: property.locationVerified ? 'El lugar existe y está ubicado.' : 'Todavía falta comprobar la ubicación.',
      status: property.locationVerified ? 'complete' : 'pending',
    },
    {
      key: 'visual',
      label: 'Material real del lugar',
      description: property.videoValidated ? 'Podés ver mejor el estado real.' : 'Todavía falta material real del lugar.',
      status: property.videoValidated ? 'complete' : 'pending',
    },
    {
      key: 'relationship',
      label: 'Relación con la propiedad',
      description: property.propertyRelationshipVerified ? 'Está confirmado el vínculo con el lugar.' : 'Falta confirmar vínculo con el lugar.',
      status: property.propertyRelationshipVerified ? 'complete' : 'pending',
    },
    {
      key: 'onsite',
      label: 'Verificación presencial',
      description: property.hasPresencialVerification ? 'Ya hubo una revisión en el lugar.' : 'Todavía no hay revisión en el lugar.',
      status: property.hasPresencialVerification ? 'complete' : 'pending',
    },
  ];

  return {
    verificationScore: verificationItems.filter((item) => item.status === 'complete').length,
    verificationItems,
  };
};