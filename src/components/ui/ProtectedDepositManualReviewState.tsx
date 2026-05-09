import type { ReservationFlowStage, ReservationFlowViewerRole } from '../../lib/reservationFlow';
import {
  getProtectedDepositManualReviewCard,
  type ProtectedDepositManualReviewReason,
} from '../../lib/protectedDepositManualReview';
import { Icons } from '../Icons';
import { ReservationConfirmedState } from './ReservationConfirmedState';

type ProtectedDepositManualReviewStateProps = {
  stage?: ReservationFlowStage | null;
  viewerRole: ReservationFlowViewerRole;
  conversationId?: string | null;
  depositPaymentReference?: string | null;
  manualReviewReason?: ProtectedDepositManualReviewReason | null;
  manualReviewOpenedAt?: string | null;
  guestCheckinConfirmed?: boolean;
  guestCheckinConfirmedAt?: string | null;
  guestCheckinLatitude?: number | null;
  guestCheckinLongitude?: number | null;
  guestCheckinAccuracyMeters?: number | null;
  hostAccessConfirmed?: boolean;
  hostAccessConfirmedAt?: string | null;
  className?: string;
};

export const ProtectedDepositManualReviewState = ({ className, ...input }: ProtectedDepositManualReviewStateProps) => {
  const reviewCard = getProtectedDepositManualReviewCard(input);

  if (!reviewCard) {
    return null;
  }

  return (
    <ReservationConfirmedState
      eyebrow="Seña protegida"
      title={reviewCard.title}
      description={reviewCard.description}
      details={reviewCard.details}
      nextStep={reviewCard.nextStep}
      tone="warning"
      icon={<Icons.AlertTriangle className="h-5 w-5" />}
      className={className}
    />
  );
};

export default ProtectedDepositManualReviewState;