# Changelog Review

## Summary

This audit pass focused on state consistency between reservations and chat, plus cleanup required to leave validation output ready for external review.

## Main Product Changes

- Completed direct reservations now render as finalized history instead of leaking pending proposal semantics.
- Confirmed direct booking-backed chats no longer infer a protected-deposit step from `booking_id` alone.
- External checkout redirects now go through a shared browser helper so test runs stay clean.
- Auth session refresh no longer emits leftover debug logging.
- A top-level `type-check` script is now available so the requested validation command maps to an actual repository script.

## Files Touched

- `package.json`
- `src/lib/reservationFlow.ts`
- `src/lib/browserNavigation.ts`
- `src/components/SecureChat.tsx`
- `src/components/MyBookings.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/__tests__/MyBookings.test.tsx`
- `src/components/__tests__/SecureChat.test.tsx`

## Reviewer Focus

### Functional spot checks

- Open `MyBookings` with a completed direct booking and confirm the stay stays under `Finalizadas` with closeout semantics.
- Open `SecureChat` for a confirmed direct reservation-backed conversation and confirm the header/status no longer asks for deposit actions.
- Recheck a protected flow and confirm deposit-choice and protected-payment paths still behave the same.

### Technical spot checks

- Confirm the regression coverage added for the two audited inconsistencies.
- Confirm the full validation suite and production build remain green.

## Artifacts For External Review

- `AUDIT_REPORT.md`
- `VALIDATION_REPORT.md`
- `review-artifacts/home-dashboard.png`
- `review-artifacts/home-mobile.png`
- `review-artifacts/property-detail.png`
- `review-artifacts/booking-flow-modal.png`
- `review-artifacts/my-bookings.png`
- `review-artifacts/secure-chat.png`
- `review-artifacts/property-detail-error-state.png`