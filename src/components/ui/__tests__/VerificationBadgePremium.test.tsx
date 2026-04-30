import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { VerificationBadgePremium } from '../VerificationBadgePremium';
import { PresencialVerificationBadge } from '../PresencialVerificationBadge';

describe('VerificationBadgePremium', () => {
  test('renders only the borderless verification mark for verified cards', () => {
    const { container } = render(<VerificationBadgePremium data-testid="premium-badge" />);

    const badge = screen.getByRole('img', { name: 'Verificado presencialmente' });
    const mark = container.querySelector('img');

    expect(badge).toHaveClass('inline-flex', 'shrink-0', 'items-center', 'justify-center', 'h-[58px]', 'w-[51px]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('src', '/verified-presencial-badge3.png');
    expect(mark).toHaveClass('h-full', 'w-full', 'shrink-0', 'object-contain');
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });

  test('supports the glass card variant used on presencial listing cards', () => {
    const { container } = render(<VerificationBadgePremium size="xs" variant="glass-card" />);

    const badge = screen.getByRole('img', { name: 'Verificado presencialmente' });
    const mark = container.querySelector('img');

    expect(badge).toHaveClass(
      'inline-flex',
      'shrink-0',
      'items-center',
      'justify-center',
      'rounded-[12px]',
      'bg-[rgba(255,255,255,0.85)]',
      'px-2',
      'py-1.5',
      'shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
      'backdrop-blur-[6px]',
      'transition-transform',
      'duration-150',
      'ease-out',
      'hover:scale-[1.03]',
      'group-hover:scale-[1.03]',
    );
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('src', '/verified-presencial-badge3.png');
    expect(mark).toHaveClass('shrink-0', 'object-contain', 'h-[56px]', 'w-[49px]');
  });

  test('supports the medium size variant', () => {
    render(<VerificationBadgePremium size="md" />);

    expect(screen.getByRole('img', { name: 'Verificado presencialmente' })).toHaveClass('h-[66px]', 'w-[58px]');
  });

  test('keeps the shared UI badge when the presencial wrapper requests the large size', () => {
    render(<PresencialVerificationBadge size="lg" />);

    const badge = screen.getByRole('img', { name: 'Verificado presencialmente' });

    expect(badge).toHaveClass('h-[66px]', 'w-[58px]');
  });
});