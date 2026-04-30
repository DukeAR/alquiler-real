import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const useAuthMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../lib/modal', () => ({
  showLoginModal: vi.fn(),
}));

import { PropertyCard } from '../PropertyCard';
import { getPropertyCardVerificationState } from '../../lib/propertyVerification';

const highHostTrust = {
  score: 4,
  level: 'high' as const,
  items: [
    { key: 'identity', label: 'Identidad confirmada', description: 'Identidad ya confirmada.', status: 'complete' as const },
    { key: 'reservations', label: 'Historial de reservas', description: '6 reservas completadas.', status: 'complete' as const },
    { key: 'reviews', label: 'Reseñas de huéspedes', description: '4 reseñas de huéspedes.', status: 'complete' as const },
    { key: 'tenure', label: 'Antigüedad en la plataforma', description: '3 años en la plataforma.', status: 'complete' as const },
  ],
};

const sampleProperty = {
  id: 'p1',
  title: 'Casa frente al mar',
  location: 'Santa Teresita',
  price: 120000,
  hostName: 'Laura',
  hostId: 'h1',
  hostSince: '2022-01-01',
  hostExperienceYears: 3,
  historicalConsistency: 95,
  unresolvedReviewsCount: 0,
  identityValidated: true,
  locationVerified: true,
  videoValidated: false,
  traceabilityLevel: 'high' as const,
  imageUrl: 'https://example.com/image.jpg',
  coordinates: { lat: -36.7, lng: -56.7 },
  description: 'Amplia y luminosa.',
  rating: 4.8,
  reviewsCount: 12,
  isSuperHost: true,
  maxGuests: 5,
  propertyType: 'house',
  propertyRelationshipVerified: true,
  hasPresencialVerification: false,
  isVerifiedProperty: true,
  hostTrustScore: 4,
  hostTrust: highHostTrust,
  verificationPhotoCount: 3,
};

describe('PropertyCard', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
  });

  test('renders the standard card model with visible verification evidence', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        verificationGuidanceLabel="Más verificado"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Santa Teresita')).toBeInTheDocument();
    expect(screen.getByText(/120\.000/)).toBeInTheDocument();
    expect(screen.getByText('/ noche')).toBeInTheDocument();
    expect(screen.queryByText('Precio por noche')).toBeNull();
    expect(screen.queryByText('4.8')).toBeNull();
    expect(screen.queryByText('12 reseñas')).toBeNull();
    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', '3/4 · Información validada');
    expect(verificationBlock).toHaveTextContent('3/4 · Información validada');
    expect(within(verificationBlock).queryByRole('list')).toBeNull();
    expect(within(verificationBlock).queryByText('Anfitrión confirmado')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Verificado presencialmente' })).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByText('Confianza visible')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('12 reseñas reales')).toBeNull();
    expect(screen.queryByText('Anfitrión: Laura')).toBeNull();
    expect(screen.queryByText('Abrir ficha')).toBeNull();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir detalle de Casa frente al mar/i })).toBeInTheDocument();
  });

  test('uses the standard card model with exactly 3 visible checks', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          verificationPhotoCount: 0,
        }}
      />,
    );

    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');

    expect(verificationBlock).toHaveAttribute('aria-label', '3/4 · Información validada');
    expect(verificationBlock).toHaveTextContent('3/4 · Información validada');
    expect(within(verificationBlock).queryByRole('list')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
  });

  test('keeps the same public verification summary even if media or availability changes', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          verificationPhotoCount: 0,
          availabilityValidated: true,
        }}
      />,
    );

    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');

    expect(verificationBlock).toHaveAttribute('aria-label', '3/4 · Información validada');
    expect(verificationBlock).toHaveTextContent('3/4 · Información validada');
    expect(within(verificationBlock).queryByRole('list')).toBeNull();
  });

  test('keeps the card focused on verification even when the host trust level changes', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          hostTrustScore: 2,
          hostTrust: {
            score: 2,
            level: 'medium',
            items: [
              { key: 'identity', label: 'Identidad confirmada', description: 'Identidad ya confirmada.', status: 'complete' },
              { key: 'reservations', label: 'Historial de reservas', description: '2 reservas completadas.', status: 'pending' },
              { key: 'reviews', label: 'Reseñas de huéspedes', description: '1 reseña de huéspedes.', status: 'pending' },
              { key: 'tenure', label: 'Antigüedad en la plataforma', description: '8 meses en la plataforma.', status: 'complete' },
            ],
          },
        }}
      />,
    );

    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.getByText('3/4 · Información validada')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('keeps the badge hidden unless the ordering context marks the card as a real standout', () => {
    render(
      <PropertyCard
        property={sampleProperty}
      />,
    );

    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    expect(screen.getByText('3/4 · Información validada')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('uses the premium card model when the presencial verification completes the four public validations', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          availabilityValidated: true,
          hasPresencialVerification: true,
        }}
        verificationGuidanceLabel="Más verificado"
      />,
    );

    const presencialBadge = screen.getByTestId('property-card-premium-badge');
    expect(presencialBadge).toHaveClass(
      'absolute',
      'left-3',
      'top-3',
      'z-20',
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
    expect(presencialBadge).toHaveAttribute('role', 'img');
    expect(presencialBadge).toHaveAttribute('aria-label', 'Verificado presencialmente');
    expect(within(presencialBadge).queryByText('Verificado presencialmente')).toBeNull();
    const presencialBadgeMark = presencialBadge.querySelector('img');
    expect(presencialBadgeMark).not.toBeNull();
    expect(presencialBadgeMark).toHaveAttribute('src', '/verified-presencial-badge3.png');
    expect(presencialBadgeMark).toHaveClass('shrink-0', 'object-contain', 'h-[56px]', 'w-[49px]');
    expect(presencialBadge.parentElement).toHaveClass('relative', 'h-[232px]', 'overflow-hidden', 'bg-slate-100', 'sm:h-[260px]', 'lg:h-[300px]');
    expect(screen.getByTestId('property-card-price-row')).not.toContainElement(presencialBadge);
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('(5/5)')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('keeps the standard card model when the presencial flag arrives without all four public validations', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          locationVerified: false,
          hasPresencialVerification: true,
        }}
      />,
    );

    expect(screen.queryByRole('img', { name: 'Verificado presencialmente' })).toBeNull();
    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', '3/4 · Información validada');
    expect(within(verificationBlock).getByText('3/4 · Información validada')).toBeInTheDocument();
    expect(within(verificationBlock).queryByRole('list')).toBeNull();
  });

  test('keeps the standard verification summary subtle even when the card is highlighted', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        emphasizeVerification
      />,
    );

    const trustLine = screen.getByTestId('property-card-verification');

    expect(within(trustLine).getByText('3/4 · Información validada')).toHaveClass('text-slate-500');
  });

  test('keeps the featured card free of extra verification badges', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        decisionFeatured
        decisionSupportLabel="Buena relación precio / información"
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByText('Buena relación precio / información')).toBeNull();
    expect(screen.queryByText('Más comprobado')).toBeNull();
    expect(screen.getByText('3/4 · Información validada')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('keeps the favorites variant free of Explore guidance labels', () => {
    render(<PropertyCard property={sampleProperty} variant="favorites" onClick={vi.fn()} />);

    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');

    expect(verificationBlock).toHaveAttribute('aria-label', '3/4 · Información validada');
    expect(within(verificationBlock).getByText('3/4 · Información validada')).toBeInTheDocument();
    expect(within(verificationBlock).queryByRole('list')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByText('Más confiable')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('Abrir ficha')).toBeNull();
    expect(screen.queryByText('Abrir detalle')).toBeNull();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir detalle de Casa frente al mar/i })).toBeInTheDocument();
  });

  test('supports keyboard navigation and favorite toggling', () => {
    const onClick = vi.fn();
    const onFavoriteToggle = vi.fn();

    render(
      <PropertyCard
        property={sampleProperty}
        isFavorite={false}
        onClick={onClick}
        onFavoriteToggle={onFavoriteToggle}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /Abrir detalle de Casa frente al mar/i }), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Guardar propiedad/i }));
    expect(onFavoriteToggle).toHaveBeenCalledWith('p1', true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('hides the save button when there is no active session', () => {
    useAuthMock.mockReturnValue({ user: null });

    render(<PropertyCard property={sampleProperty} onClick={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Guardar propiedad/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Quitar de guardados/i })).toBeNull();
  });

  test('centralizes the card verification rules into a single coherent state', () => {
    const standardState = getPropertyCardVerificationState(sampleProperty);

    expect(standardState.model).toBe('standard');
    expect(standardState.presencialVerified).toBe(false);
    expect(standardState.count).toBe(4);
    expect(standardState.countLabel).toBe('4 validaciones visibles');
    expect(standardState.verificationChecks.hostConfirmed).toBe(true);
    expect(standardState.verificationChecks.locationVerified).toBe(true);
    expect(standardState.verificationChecks.geolocationPrecise).toBe(true);
    expect(standardState.verificationChecks.realMedia).toBe(true);
    expect(standardState.verificationChecks.availabilityValidated).toBe(false);

    const premiumState = getPropertyCardVerificationState({
      ...sampleProperty,
      availabilityValidated: true,
      hasPresencialVerification: true,
    });

    expect(premiumState.model).toBe('premium');
    expect(premiumState.presencialVerified).toBe(true);
    expect(premiumState.count).toBe(5);
    expect(premiumState.checks.every((check) => check.complete)).toBe(true);

    const fullVisibleState = getPropertyCardVerificationState({
      ...sampleProperty,
      availabilityValidated: true,
      hasPresencialVerification: false,
    });

    expect(fullVisibleState.model).toBe('premium');
    expect(fullVisibleState.presencialVerified).toBe(true);
    expect(fullVisibleState.count).toBe(5);
    expect(fullVisibleState.countLabel).toBeNull();
    expect(fullVisibleState.checks.every((check) => check.complete)).toBe(true);

    const inconsistentPremiumState = getPropertyCardVerificationState({
      ...sampleProperty,
      availabilityValidated: false,
      hasPresencialVerification: true,
    });

    expect(inconsistentPremiumState.model).toBe('standard');
    expect(inconsistentPremiumState.presencialVerified).toBe(false);
    expect(inconsistentPremiumState.count).toBe(4);
    expect(inconsistentPremiumState.countLabel).toBe('4 validaciones visibles');

    const numericFallbackState = getPropertyCardVerificationState({ verificationScore: 4 });

    expect(numericFallbackState.model).toBe('standard');
    expect(numericFallbackState.count).toBe(4);
    expect(numericFallbackState.checks.filter((check) => check.complete)).toHaveLength(4);
  });
});