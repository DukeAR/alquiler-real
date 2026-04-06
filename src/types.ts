import type { PropertyVerificationItem } from './lib/propertyVerification';
import type { HostTrustSummary } from './lib/hostTrust';

export type TraceabilityLevel = 'low' | 'medium' | 'high';

export interface TraceabilityFactor {
  label: string;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface TraceabilityReport {
  level: TraceabilityLevel;
  score: number;
  factors: TraceabilityFactor[];
}

export interface Property {
  id: string;
  title: string;
  location: string;
  propertyType?: string;
  verificationScore?: number;
  verificationItems?: PropertyVerificationItem[];
  hostTrustScore?: number;
  hostTrust?: HostTrustSummary;
  price: number;
  hostName: string;
  hostId: string;
  hostSince: string;
  hostExperienceYears: number;
  historicalConsistency: number;
  unresolvedReviewsCount: number;
  identityValidated: boolean;
  locationVerified: boolean;
  videoValidated: boolean;
  traceabilityLevel: TraceabilityLevel;
  traceabilityReport?: TraceabilityReport;
  imageUrl: string;
  coordinates: { lat: number; lng: number };
  description: string;
  rating: number;
  reviewsCount: number;
  isSuperHost?: boolean;
  maxGuests?: number;
  propertyRelationshipVerified?: boolean;
  hasPresencialVerification?: boolean;
  hasDigitalVerification?: boolean;
  isVerifiedProperty?: boolean;
}

export interface Review {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  photosMatchReality: boolean;
  pressureToBookFast: boolean;
}

export interface GuestPlatformHistory {
  completedStays: number;
  conflictsCount: number;
  cancellationsCount: number;
}

export interface GuestHostReviewSnippet {
  id: string;
  authorName: string;
  date: string;
  comment: string;
}

export interface GuestProfileCompletion {
  profileComplete: boolean;
  photoUploaded: boolean;
  basicDetailsComplete: boolean;
}

export interface GuestOperationSignal {
  id: string;
  label: string;
  active: boolean;
}

export interface GuestRequestProfile {
  identityVerified: boolean;
  platformHistory: GuestPlatformHistory;
  hostReviews: GuestHostReviewSnippet[];
  profileCompletion: GuestProfileCompletion;
  operationSignals: GuestOperationSignal[];
  memberSince: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  userName?: string;
  propertyTitle?: string;
  imageUrl?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  totalPrice?: number;
  cancellationDeadline?: string | null;
  date?: string;
  contractAccepted?: boolean;
  contractJson?: string;
  stay_code?: string;
  verified?: number;
  guestProfile?: GuestRequestProfile;
}

export interface Conversation {
  id: string;
  property_id: string;
  booking_id?: string;
  tenant_id: string;
  host_id: string;
  tenantName?: string;
  hostName?: string;
  propertyTitle?: string;
  propertyImage?: string;
  last_message?: string;
  updated_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_system?: boolean;
  is_suspicious?: boolean;
  is_optimistic?: boolean;
  created_at: string;
}

export interface TenantReview {
  id: string;
  hostName: string;
  date: string;
  compliedWithAgreements: 'never' | 'sometimes' | 'always';
  clearCommunication: 'never' | 'sometimes' | 'always';
  respectedRules: 'never' | 'sometimes' | 'always';
  reportedIncidents: boolean;
  reportedByHost: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  memberSince: string;
  completedStays: number;
  lastStayDate?: string;
  completionRate: number;
  status: 'new' | 'active' | 'with_history' | 'with_alerts';
  reviews: TenantReview[];
  hasBehavioralWarnings: boolean;
  riskScore: number;
}

export interface HostProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  identityValidated: boolean;
  memberSince: string;
  verificationMethod?: 'digital' | 'presencial';
  status: 'new' | 'active' | 'with_history' | 'highly_traceable' | 'with_warnings';

  publishedPropertiesCount: number;
  activePropertiesCount: number;
  avgPublicationAgeMonths: number;
  completedStaysCount: number;
  stayCompletionRate: number;
  lastVerifiedActivityDate?: string;

  queriesReceivedCount: number;
  chatsStartedCount: number;
  agreementsFinalizedCount: number;
  avgResponseTimeMinutes: number;
  hostCancellationsCount: number;

  reputation: {
    photosMatchRealityRate: number;
    infoClarityRate: number;
    agreementComplianceRate: number;
    communicationRate: number;
    attemptsToChangeConditionsOutside: boolean;
  };

  verificationsSummary: {
    presencialCount: number;
    gpsProofCount: number;
    videoValidationCount: number;
  };

  alerts: string[];
  riskScore: number;
}
