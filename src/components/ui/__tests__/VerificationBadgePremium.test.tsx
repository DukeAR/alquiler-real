import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { VerificationBadgePremium } from '../VerificationBadgePremium';
import { PresencialVerificationBadge } from '../PresencialVerificationBadge';

describe('VerificationBadgePremium', () => {
  test('renders the shared circular seal asset inside the presencial badge UI', () => {
    const { container } = render(<VerificationBadgePremium data-testid="premium-badge" />);

    const badge = screen.getByRole('img', { name: 'Verificado presencialmente' });
    const mark = container.querySelector('img');

    expect(badge).toHaveClass('inline-flex', 'items-center', 'whitespace-nowrap', 'rounded-full', 'bg-[rgba(253,253,253,0.76)]', 'text-slate-700', 'transition-transform', 'duration-200', 'hover:-translate-y-0.5', 'gap-2', 'px-3', 'py-1.5');
    expect(within(badge).getByText('Verificado presencialmente')).toBeInTheDocument();
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('src', '/verified-presencial-circular.png');
    expect(mark).toHaveClass('shrink-0', 'object-contain', 'h-[34px]', 'w-[34px]');
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });

  test('supports the medium size variant', () => {
    render(<VerificationBadgePremium size="md" />);

    expect(screen.getByRole('img', { name: 'Verificado presencialmente' })).toHaveClass('gap-3', 'px-4', 'py-2.5');
  });

  test('keeps the shared UI badge when the presencial wrapper requests the large size', () => {
    render(<PresencialVerificationBadge size="lg" />);

    const badge = screen.getByRole('img', { name: 'Verificado presencialmente' });

    expect(badge).toHaveClass('gap-3', 'px-4', 'py-2.5');
    expect(within(badge).getByText('Verificado presencialmente')).toBeInTheDocument();
  });
});