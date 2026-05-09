import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../config/db', () => ({
  db: {
    query: (text: string, params?: unknown[]) => queryMock(text, params),
  },
}));

import { evaluateInternalRisk, getInternalRiskDecision } from '../internalRisk';

const matchesInternalRiskProfileQuery = (text: string) => (
  text.includes('COALESCE(report_stats.total_reports') && text.includes('profile_photo as "profilePhoto"')
);

const matchesInternalRiskResponseQuery = (text: string) => (
  text.includes('JOIN messages m ON m.conversation_id = c.id') && text.includes('WHERE c.host_id = $1 OR c.tenant_id = $1')
);

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const buildInternalRiskRow = (overrides: Record<string, unknown> = {}) => ({
  role: 'host',
  phone: '+5491112345678',
  bio: 'Perfil completo',
  zone: 'Pinamar',
  profilePhoto: 'https://example.com/avatar.jpg',
  totalReviews: 3,
  totalProperties: 1,
  totalBookingsHosted: 2,
  createdAt: daysAgo(180),
  memberSince: daysAgo(180),
  emailVerified: true,
  phoneVerified: true,
  documentaryVerified: true,
  identityVerificationStatus: 'verified',
  strikesCount: 0,
  moderationStatus: 'clear',
  accountLimitedUntil: null,
  accountBlockedUntil: null,
  reportsCount: 0,
  pendingReportsCount: 0,
  confirmedReportsCount: 0,
  confirmedSevereReportsCount: 0,
  pendingReportScore: 0,
  confirmedReportScore: 0,
  guestCancellationsCount: 0,
  hostCancellationsCount: 0,
  blockedMessagesCount: 0,
  notAdvancedRequestsCount: 0,
  phoneMatchesCount: 0,
  dniMatchesCount: 0,
  dniNumber: '30111222',
  recentPropertiesCount: 0,
  activePropertiesCount: 1,
  duplicateListingClusters: 0,
  sentMessagesLast24h: 0,
  ...overrides,
});

const mockRiskQueries = (overrides: Record<string, unknown> = {}) => {
  const row = buildInternalRiskRow(overrides);

  queryMock.mockImplementation(async (text: string) => {
    if (matchesInternalRiskProfileQuery(text)) {
      return { rows: [row] };
    }

    if (matchesInternalRiskResponseQuery(text)) {
      return { rows: [] };
    }

    if (text.includes('UPDATE users') && text.includes('internal_trust_score')) {
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
};

describe('internal risk moderation rules', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('does not auto-block a user for a single isolated pending report', async () => {
    mockRiskQueries({
      reportsCount: 1,
      pendingReportsCount: 1,
      pendingReportScore: 1,
    });

    const decision = await getInternalRiskDecision('user-1', 'create_booking');

    expect(decision.blocked).toBe(false);
    expect(decision.evaluation?.snapshot.level).toBe('low');
    expect(decision.evaluation?.snapshot.actionLimited).toBe(false);
    expect(decision.evaluation?.snapshot.riskFlags).toContain('risk_low');
  });

  test('lowers exposure for duplicate listing clusters without auto-blocking publication', async () => {
    mockRiskQueries({
      duplicateListingClusters: 1,
      recentPropertiesCount: 1,
    });

    const decision = await getInternalRiskDecision('user-1', 'publish_property');

    expect(decision.blocked).toBe(false);
    expect(decision.evaluation?.snapshot.level).toBe('medium');
    expect(decision.evaluation?.snapshot.visibilityPenalty).toBeGreaterThan(0);
    expect(decision.evaluation?.snapshot.riskFlags).toContain('risk_medium');
  });

  test('records message spam risk for new accounts without immediately blocking chat', async () => {
    mockRiskQueries({
      totalReviews: 0,
      totalProperties: 0,
      totalBookingsHosted: 0,
      createdAt: daysAgo(3),
      memberSince: daysAgo(3),
      documentaryVerified: false,
      identityVerificationStatus: 'unverified',
      sentMessagesLast24h: 25,
    });

    const decision = await getInternalRiskDecision('user-1', 'send_message');

    expect(decision.blocked).toBe(false);
    expect(decision.evaluation?.snapshot.newAccount).toBe(true);
    expect(decision.evaluation?.snapshot.level).toBe('medium');
    expect(decision.evaluation?.snapshot.riskFlags).toContain('risk_medium');
  });

  test('escalates to manual review only after multiple medium-strength signals accumulate', async () => {
    mockRiskQueries({
      duplicateListingClusters: 1,
      hostCancellationsCount: 2,
      suspiciousPaymentProofsCount: 1,
    });

    const decision = await getInternalRiskDecision('user-1', 'publish_property');

    expect(decision.blocked).toBe(true);
    expect(decision.reason).toBe('Necesitamos confirmar algunos datos antes de habilitar esta accion.');
    expect(decision.evaluation?.snapshot.level).toBe('high');
    expect(decision.evaluation?.snapshot.manualReviewRequired).toBe(true);
    expect(decision.evaluation?.snapshot.riskFlags).toContain('risk_high');
  });

  test('keeps boosts locked for immature accounts and unlocks them for stable ones', async () => {
    mockRiskQueries({
      totalReviews: 0,
      totalProperties: 0,
      totalBookingsHosted: 0,
      createdAt: daysAgo(5),
      memberSince: daysAgo(5),
      documentaryVerified: false,
      identityVerificationStatus: 'unverified',
    });

    const earlyDecision = await getInternalRiskDecision('user-1', 'access_boosts');

    expect(earlyDecision.blocked).toBe(true);
    expect(earlyDecision.reason).toContain('boosts');

    queryMock.mockReset();
    mockRiskQueries();

    const matureDecision = await getInternalRiskDecision('user-1', 'access_boosts');

    expect(matureDecision.blocked).toBe(false);
    expect(matureDecision.evaluation?.snapshot.stableAccount).toBe(true);
    expect(matureDecision.evaluation?.snapshot.boostAccessUnlocked).toBe(true);
  });

  test('applies limitation status when the account already has two strikes', async () => {
    mockRiskQueries({
      strikesCount: 2,
    });

    const evaluation = await evaluateInternalRisk('user-1');
    const decision = await getInternalRiskDecision('user-1', 'create_booking');

    expect(evaluation?.snapshot.moderationStatus).toBe('limited');
    expect(decision.blocked).toBe(true);
    expect(decision.reason).toBe('Esta accion requiere verificacion adicional.');
  });
});
