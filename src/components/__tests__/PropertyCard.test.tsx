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

  test('keeps identity-validated cards free of verification badges until presencial verification exists', () => {
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
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Verificado presencialmente' })).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.queryByText('Anfitrión confirmado')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByText('Confianza visible')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('12 reseñas reales')).toBeNull();
    expect(screen.queryByText('Anfitrión: Laura')).toBeNull();
    expect(screen.queryByText('Abrir ficha')).toBeNull();
    expect(screen.getByText('Ver propiedad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver propiedad: Casa frente al mar/i })).toBeInTheDocument();
    expect(screen.getByTestId('property-card-price-row').firstElementChild).toHaveClass('text-[2.05rem]', 'text-slate-950');
    expect(screen.queryByText('Mejor información para decidir')).toBeNull();
  });

  test('example: a card with only identity validation keeps verification hidden', () => {
    const identityValidatedExample = {
      ...sampleProperty,
      id: 'example-intermediate',
      title: 'Departamento con balcón y buena luz',
      location: 'Mar del Tuyú',
      identityValidated: true,
      locationVerified: false,
      propertyRelationshipVerified: false,
      verificationPhotoCount: 0,
      availabilityValidated: false,
      hasPresencialVerification: false,
      isVerifiedProperty: false,
    };

    render(<PropertyCard property={identityValidatedExample} onClick={vi.fn()} />);

    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.queryByText('Anfitrión confirmado')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Verificado presencialmente' })).toBeNull();
  });

  test('keeps compact cards free of verification badges without presencial verification', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        density="compact"
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Anfitrión confirmado')).toBeNull();
  });

  test('keeps identity-only cards free of verification badges even if other non-public signals change', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          verificationPhotoCount: 0,
        }}
      />,
    );

    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
  });

  test('keeps non-presencial cards free of verification badges even if media or availability changes', () => {
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
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
  });

  test('keeps the card free of verification badges even when the host trust level changes', () => {
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
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.getByText('Ver propiedad')).toBeInTheDocument();
  });

  test('keeps the badge hidden unless the ordering context marks the card as a real standout', () => {
    render(
      <PropertyCard
        property={sampleProperty}
      />,
    );

    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.getByText('Ver propiedad')).toBeInTheDocument();
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
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Verificado presencialmente' })).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', 'Verificado presencialmente');
    expect(within(verificationBlock).getByTestId('property-card-verification-icon')).toHaveClass(
      'inline-flex',
      'h-7',
      'w-7',
      'shrink-0',
      'items-center',
      'justify-center',
      'rounded-full',
      'bg-emerald-200',
      'text-emerald-800',
    );
    expect(within(verificationBlock).getByText('Verificado presencialmente')).toBeInTheDocument();
    expect(verificationBlock.firstElementChild).toHaveClass('bg-[#ECFDF3]', 'border-emerald-300/70', 'gap-3', 'px-4', 'py-3', 'rounded-2xl');
    expect(within(verificationBlock).getByText('Verificado presencialmente')).toHaveClass('text-emerald-900', 'text-[0.98rem]', 'font-semibold');
    expect(within(verificationBlock).getByText('Identidad, ubicación y acceso confirmados')).toHaveClass('text-emerald-900/80', 'text-[0.74rem]');
    expect(screen.getByRole('button', { name: /Ver propiedad: Casa frente al mar/i })).toHaveClass('box-border', 'w-full', 'h-full', 'border-2', 'border-[#22c55e]', 'shadow-lg', 'duration-150', 'ease-[ease]', 'hover:-translate-y-1');
    expect(screen.getByAltText('Casa frente al mar')).toHaveClass('duration-150', 'group-hover:scale-[1.02]');
    expect(screen.getByTestId('property-card-cta')).toHaveClass('absolute', 'bottom-4', 'right-4', 'opacity-0', 'group-hover:opacity-100');
    expect(within(verificationBlock).getByTestId('property-card-verification-icon')).toHaveClass('group-hover:scale-[1.05]');
    expect(within(verificationBlock).queryByText('Mejor información para decidir')).toBeNull();
    expect(within(verificationBlock).queryByText('Identidad del anfitrión confirmada')).toBeNull();
    expect(screen.queryByText('(5/5)')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.getByText('Ver propiedad')).toBeInTheDocument();
  });

  test('prioritizes the presencial card model whenever the presencial flag exists', () => {
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
    expect(within(verificationBlock).getByTestId('property-card-verification-icon')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Verificado presencialmente')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Identidad, ubicación y acceso confirmados')).toBeInTheDocument();
  });

  test('keeps highlighted non-presencial cards free of verification badges', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        emphasizeVerification
      />,
    );

    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
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
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.getByText('Ver propiedad')).toBeInTheDocument();
  });

  test('keeps the favorites variant free of Explore guidance labels', () => {
    render(<PropertyCard property={sampleProperty} variant="favorites" onClick={vi.fn()} />);

    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.queryByText('Más confiable')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('Abrir ficha')).toBeNull();
    expect(screen.queryByText('Abrir detalle')).toBeNull();
    expect(screen.getByText('Ver propiedad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver propiedad: Casa frente al mar/i })).toBeInTheDocument();
  });

  test('supports keyboard navigation and favorite toggling', () => {
    vi.useFakeTimers();

    const onClick = vi.fn();
    const onFavoriteToggle = vi.fn();

    try {
      render(
        <PropertyCard
          property={sampleProperty}
          isFavorite={false}
          onClick={onClick}
          onFavoriteToggle={onFavoriteToggle}
        />,
      );

      const card = screen.getByRole('button', { name: /Ver propiedad: Casa frente al mar/i });

      fireEvent.keyDown(card, { key: 'Enter' });
      expect(card).toHaveClass('scale-[1.015]', 'opacity-0', 'pointer-events-none');
      expect(onClick).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(180);
      expect(onClick).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Guardar propiedad/i }));
      expect(onFavoriteToggle).toHaveBeenCalledWith('p1', true);
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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
    expect(standardState.publicLevel).toBe('identity');
    expect(standardState.count).toBe(1);
  expect(standardState.summaryTitle).toBe('Identidad verificada');
  expect(standardState.summaryDescription).toBeNull();
  expect(standardState.countLabel).toBe('Identidad verificada');
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
    expect(premiumState.publicLevel).toBe('presencial');
    expect(premiumState.count).toBe(4);
    expect(premiumState.summaryTitle).toBe('Verificado presencialmente');
    expect(premiumState.summaryDescription).toBe('Identidad, ubicación y acceso confirmados');
    expect(premiumState.checks.every((check) => check.complete)).toBe(true);

    const fullVisibleState = getPropertyCardVerificationState({
      ...sampleProperty,
      availabilityValidated: true,
      hasPresencialVerification: false,
    });

    expect(fullVisibleState.model).toBe('standard');
    expect(fullVisibleState.presencialVerified).toBe(false);
    expect(fullVisibleState.publicLevel).toBe('identity');
    expect(fullVisibleState.count).toBe(1);
    expect(fullVisibleState.countLabel).toBe('Identidad verificada');

    const inconsistentPremiumState = getPropertyCardVerificationState({
      ...sampleProperty,
      availabilityValidated: false,
      hasPresencialVerification: true,
    });

    expect(inconsistentPremiumState.model).toBe('premium');
    expect(inconsistentPremiumState.presencialVerified).toBe(true);
    expect(inconsistentPremiumState.publicLevel).toBe('presencial');
    expect(inconsistentPremiumState.count).toBe(4);
    expect(inconsistentPremiumState.countLabel).toBeNull();

    const numericFallbackState = getPropertyCardVerificationState({ verificationScore: 4 });

    expect(numericFallbackState.model).toBe('standard');
    expect(numericFallbackState.publicLevel).toBe('none');
    expect(numericFallbackState.count).toBe(0);
    expect(numericFallbackState.checks.filter((check) => check.complete)).toHaveLength(0);
  });

  test('keeps the neutral state when identity validation is not present', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          identityValidated: false,
          locationVerified: false,
          propertyRelationshipVerified: false,
          verificationPhotoCount: 0,
          isVerifiedProperty: false,
        }}
        deemphasizeNonPresencial
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Ver propiedad: Casa frente al mar/i })).toHaveClass('opacity-90', 'hover:opacity-100', 'border-transparent');
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Sin verificación')).toBeNull();
    expect(screen.queryByText('Datos no confirmados')).toBeNull();
    expect(screen.queryByText('Información publicada por el anfitrión')).toBeNull();
    expect(screen.queryByTestId('property-card-premium-badge')).toBeNull();
  });

  test('keeps identity-validated cards fully opaque when the comparison block deemphasizes non-presencial options', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        deemphasizeNonPresencial
        onClick={vi.fn()}
      />,
    );

    const card = screen.getByRole('button', { name: /Ver propiedad: Casa frente al mar/i });

    expect(card).not.toHaveClass('opacity-90');
    expect(card).toHaveClass('border-transparent');
    expect(screen.queryByTestId('property-card-verification')).toBeNull();
    expect(screen.queryByText('Identidad verificada')).toBeNull();
  });
});