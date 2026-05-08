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
  createdAt?: string;
  created_at?: string;
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
  reportsCount?: number;
  pendingReportsCount?: number;
  confirmedReportsCount?: number;
  confirmedSevereReportsCount?: number;
  identityValidated: boolean;
  isIdentityVerified?: boolean;
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
  availabilityValidated?: boolean;
  propertyRelationshipVerified?: boolean;
  verificationLevel?: 'none' | 'identity' | 'presencial';
  hasPresencialVerification?: boolean;
  isPresentiallyVerified?: boolean;
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

export type ReviewType = 'host_review' | 'guest_review';

export type LegacyReviewType = 'host_to_guest' | 'guest_to_host';

export type ReviewCategoryKey =
  | 'communication'
  | 'listing_clarity'
  | 'agreement_fulfillment'
  | 'overall_experience'
  | 'respectful_treatment'
  | 'property_care'
  | 'platform_history';

export interface ReviewCategoryScore {
  key: ReviewCategoryKey;
  label: string;
  score: number;
}

export interface Review {
  id: string;
  bookingId?: string;
  conversationId?: string;
  reviewerId?: string;
  reviewedUserId?: string;
  propertyId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt?: string;
  date: string;
  type?: ReviewType | LegacyReviewType;
  categories?: ReviewCategoryScore[];
  categoryScores?: ReviewCategoryScore[];
  agreementKept?: boolean;
  wouldInteractAgain?: boolean;
  hadIncident?: boolean;
  photosMatchReality: boolean;
  pressureToBookFast: boolean;
}

export type ReportReason =
  | 'suspicious_listing'
  | 'false_information'
  | 'off_platform_attempt'
  | 'inappropriate_conduct'
  | 'not_as_listed'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  propertyId?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: string;
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

export type ReservationDepositStatus = 'external_pending' | 'reported' | 'confirmed' | 'checkout_pending' | 'held' | 'review' | 'pending_confirmation' | 'released' | 'refunded';

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
  guestCheckinConfirmed?: boolean;
  hostAccessConfirmed?: boolean;
}

export interface Booking {
  id: string;
  propertyId: string;
  userId: string;
  hostId?: string;
  conversationId?: string;
  status: BookingStatus;
  requestStatus?: ReservationRequestStatus;
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
  guestCheckinConfirmed?: boolean;
  hostAccessConfirmed?: boolean;
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
  propertyPrice?: number;
  last_message?: string;
  lastMessageSenderId?: string;
  lastMessageReadAt?: string | null;
  lastMessageCreatedAt?: string | null;
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
  guestCheckinConfirmed?: boolean;
  hostAccessConfirmed?: boolean;
  requestStartDate?: string;
  requestEndDate?: string;
  requestGuests?: number;
  requestTotalPrice?: number;
  hostMemberSince?: string;
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
  readAt?: string | null;
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
