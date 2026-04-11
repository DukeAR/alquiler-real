import type {
  PropertyAdvancedVerificationItem,
  PropertyVerificationItem,
  PropertyVerificationProgress,
  PropertyVerificationSummary,
} from './lib/propertyVerification';
import type { GuestVerificationItem, GuestVerificationSummary } from './lib/guestVerification';
import type { HostTrustSummary } from './lib/hostTrust';
import type { ProtectedDepositPricing } from './lib/protectedDeposit';
import type { PremiumVerificationOffer } from './lib/premiumVerification';
import type { UserIdentityVerification } from './lib/verificationModel';

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

export type InteractionHistoryTone = 'positive' | 'neutral';

export interface InteractionHistorySignal {
  key: string;
  label: string;
  tone: InteractionHistoryTone;
  detail?: string;
}

export interface GuestInteractionHistory {
  completedStays: number;
  feedbackCount: number;
  agreementsKeptCount: number;
  wouldInteractAgainCount: number;
  incidentsCount: number;
  publicSignals: InteractionHistorySignal[];
}

export interface HostInteractionHistory {
  completedReservationsCount: number;
  feedbackCount: number;
  agreementsKeptCount: number;
  listingConsistentCount: number;
  wouldInteractAgainCount: number;
  incidentsCount: number;
  avgResponseTimeMinutes: number;
  publicSignals: InteractionHistorySignal[];
}

export interface InteractionContinuity {
  label: string;
  detail: string;
  sharedCompletedBookings: number;
}

export interface Property {
  id: string;
  title: string;
  location: string;
  propertyType?: string;
  images?: string[];
  verificationScore?: number;
  verificationSummary?: PropertyVerificationSummary;
  verificationItems?: PropertyVerificationItem[];
  advancedVerificationItems?: PropertyAdvancedVerificationItem[];
  verificationProgress?: PropertyVerificationProgress;
  hostTrustScore?: number;
  hostTrust?: HostTrustSummary;
  hostInteractionHistory?: HostInteractionHistory;
  price: number;
  hostName: string;
  hostId: string;
  hostSince: string;
  hostExperienceYears: number;
  historicalConsistency: number;
  unresolvedReviewsCount: number;
  identityValidated: boolean;
  locationVerified: boolean;
  materialVerified?: boolean;
  videoValidated: boolean;
  traceabilityLevel: TraceabilityLevel;
  traceabilityReport?: TraceabilityReport;
  imageUrl: string;
  coordinates: { lat: number; lng: number };
  lat?: number;
  lng?: number;
  description: string;
  rating: number;
  reviewsCount: number;
  isSuperHost?: boolean;
  maxGuests?: number;
  beds?: number;
  bedrooms?: number;
  bathrooms?: number;
  verificationPhotoCount?: number;
  verificationVideoCount?: number;
  verificationDocumentCount?: number;
  verificationDocumentsReviewedCount?: number;
  documentationSubmitted?: boolean;
  documentationVerified?: boolean;
  manualReviewReady?: boolean;
  manualReviewCompleted?: boolean;
  propertyRelationshipVerified?: boolean;
  hasPresencialVerification?: boolean;
  onsiteVerifiedAt?: string;
  hasDigitalVerification?: boolean;
  hostPremiumDocumentaryVerified?: boolean;
  premiumVisibilityBoost?: number;
  premiumOnsiteOffer?: PremiumVerificationOffer | null;
  isVerifiedProperty?: boolean;
  interactionContinuity?: InteractionContinuity;
  isOwnedByViewer?: boolean;
  verificationMedia?: {
    photos?: VerificationAsset[];
    video?: VerificationAsset | null;
    documents?: VerificationAsset[];
  };
}

export interface VerificationAsset {
  id: string;
  fileType: 'image' | 'video' | 'document';
  visibility: 'public' | 'semi-public' | 'private';
  verificationScope: string;
  verificationStatus: string;
  url: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  originalName?: string | null;
  mimeType?: string | null;
}

export interface Review {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  agreementKept?: boolean;
  wouldInteractAgain?: boolean;
  hadIncident?: boolean;
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

export type GuestOperationSignalSource = 'api' | 'derived' | 'pending';

export interface GuestOperationSignal {
  id: string;
  label: string;
  active: boolean;
  source: GuestOperationSignalSource;
}

export interface GuestRequestProfileDataAvailability {
  identity: boolean;
  platformHistory: boolean;
  hostReviews: boolean;
  profileCompletion: boolean;
  operationSignals: boolean;
  memberSince: boolean;
  anyStructuredData: boolean;
}

export type GuestRequestProfileDataSource = 'api' | 'mixed' | 'fallback';

export interface GuestRequestProfile {
  identityVerified: boolean;
  platformHistory: GuestPlatformHistory;
  interactionHistory: GuestInteractionHistory;
  hostReviews: GuestHostReviewSnippet[];
  profileCompletion: GuestProfileCompletion;
  verificationSummary: GuestVerificationSummary;
  verificationScore: number;
  verificationItems: GuestVerificationItem[];
  identityVerification: UserIdentityVerification;
  operationSignals: GuestOperationSignal[];
  memberSince: string;
  dataAvailability: GuestRequestProfileDataAvailability;
  dataSource: GuestRequestProfileDataSource;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type ReservationRequestMode = 'direct' | 'protected';

export type ReservationDepositType = 'external' | 'protected';

export type ReservationRequestStatus = 'pending' | 'accepted' | 'not_advanced';

export type ReservationDepositStatus = 'external_pending' | 'reported' | 'confirmed' | 'held' | 'review' | 'pending_confirmation' | 'released' | 'refunded';

export type ReservationCancellationActor = 'guest' | 'host';

export interface ReservationRequestContext {
  propertyId: string;
  propertyTitle: string;
  hostName: string;
  propertyVerificationScore?: number;
  propertyVerificationLabel?: string;
  startDate: string;
  endDate: string;
  guests: number;
  nightly: number;
  nights: number;
  totalPrice: number;
  mode: ReservationRequestMode;
  depositType?: ReservationDepositType;
  requestCreatedAt?: string;
  requestStatus?: ReservationRequestStatus;
  depositStatus?: ReservationDepositStatus;
  protectedDepositPricing?: ProtectedDepositPricing | null;
  depositPaymentReference?: string | null;
  cancellationActor?: ReservationCancellationActor;
  bookingId?: string;
  bookingStatus?: BookingStatus;
}

export interface Booking {
  id: string;
  propertyId: string;
  userId: string;
  hostId?: string;
  conversationId?: string;
  status: BookingStatus;
  userName?: string;
  hostName?: string;
  propertyTitle?: string;
  imageUrl?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  totalPrice?: number;
  requestMode?: ReservationRequestMode;
  depositType?: ReservationDepositType;
  depositStatus?: ReservationDepositStatus;
  protectedDepositPricing?: ProtectedDepositPricing | null;
  depositPaymentReference?: string | null;
  cancellationActor?: ReservationCancellationActor;
  cancellationDeadline?: string | null;
  date?: string;
  contractAccepted?: boolean;
  contractJson?: string;
  stay_code?: string;
  verified?: number;
  guestProfile?: GuestRequestProfile;
  guestReviewSubmitted?: boolean;
  hostReviewSubmitted?: boolean;
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
  bookingStatus?: BookingStatus;
  startDate?: string;
  endDate?: string;
  guests?: number;
  totalPrice?: number;
  requestMode?: ReservationRequestMode;
  depositType?: ReservationDepositType;
  requestStatus?: ReservationRequestStatus;
  requestCreatedAt?: string;
  depositStatus?: ReservationDepositStatus;
  protectedDepositPricing?: ProtectedDepositPricing | null;
  depositPaymentReference?: string | null;
  cancellationActor?: ReservationCancellationActor;
  requestStartDate?: string;
  requestEndDate?: string;
  requestGuests?: number;
  requestTotalPrice?: number;
  hostTrustScore?: number;
  hostTrust?: HostTrustSummary;
  hostInteractionHistory?: HostInteractionHistory;
  guestProfile?: GuestRequestProfile;
  interactionContinuity?: InteractionContinuity;
  guestPositiveReviewsCount?: number;
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
  system_key?: string;
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

  interactionHistory: HostInteractionHistory;

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
}
