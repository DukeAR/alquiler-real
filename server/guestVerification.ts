import {
  buildGuestVerificationModel,
  type GuestVerificationItem,
  type GuestVerificationSummaryInput,
} from '../src/lib/guestVerification';

export type GuestVerificationSource = GuestVerificationSummaryInput;

export const buildGuestVerification = (guest: GuestVerificationSource) => {
  const verification = buildGuestVerificationModel(guest);

  return {
    verificationSummary: verification.verificationSummary,
    verificationScore: verification.verificationScore,
    verificationItems: verification.verificationItems as GuestVerificationItem[],
    identityVerification: verification.identityVerification,
    checks: verification.checks,
    missingRequirements: verification.missingRequirements,
  };
};