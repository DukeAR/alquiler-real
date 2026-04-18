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

const getCompletedCheckItems = (container: HTMLElement) => within(container)
  .getAllByRole('listitem')
  .filter((item) => item.getAttribute('data-status') === 'complete');

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
    expect(screen.getByText('Por noche')).toBeInTheDocument();
    expect(screen.queryByText('Precio por noche')).toBeNull();
    expect(screen.queryByText('4.8')).toBeNull();
    expect(screen.queryByText('12 reseñas')).toBeNull();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', '4 comprobaciones visibles');
    expect(within(verificationBlock).getByText('Verificación visible')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('4 comprobaciones visibles')).toHaveClass('text-slate-600');
    expect(within(verificationBlock).getByRole('list', { name: /checks de verificación/i })).toBeInTheDocument();
    expect(within(verificationBlock).getAllByRole('listitem')).toHaveLength(5);
    expect(within(verificationBlock).getByText('Anfitrión confirmado')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Ubicación verificada')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Geolocalización precisa')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Fotos / video reales')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Disponibilidad validada')).toBeInTheDocument();
    expect(getCompletedCheckItems(verificationBlock)).toHaveLength(4);
    expect(screen.queryByText('Verificado presencialmente')).toBeNull();
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

    const verificationBlock = screen.getByLabelText('3 comprobaciones visibles');

    expect(within(verificationBlock).getByText('Verificación visible')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('3 comprobaciones visibles')).toBeInTheDocument();
    expect(within(verificationBlock).getAllByRole('listitem')).toHaveLength(5);
    expect(within(verificationBlock).getByText('Anfitrión confirmado')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Ubicación verificada')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Geolocalización precisa')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Fotos / video reales')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Disponibilidad validada')).toBeInTheDocument();
    expect(getCompletedCheckItems(verificationBlock)).toHaveLength(3);
    expect(screen.queryByText('Más verificado')).toBeNull();
  });

  test('uses the standard card model with exactly 4 visible checks', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          verificationPhotoCount: 0,
          availabilityValidated: true,
        }}
      />,
    );

    const verificationBlock = screen.getByLabelText('4 comprobaciones visibles');

    expect(within(verificationBlock).getByText('Verificación visible')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('4 comprobaciones visibles')).toBeInTheDocument();
    expect(within(verificationBlock).getAllByRole('listitem')).toHaveLength(5);
    expect(getCompletedCheckItems(verificationBlock)).toHaveLength(4);
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
    expect(screen.getByText('4 comprobaciones visibles')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('keeps the badge hidden unless the ordering context marks the card as a real standout', () => {
    render(
      <PropertyCard
        property={sampleProperty}
      />,
    );

    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.getByText('4 comprobaciones visibles')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('uses the premium card model when presencial verification is present and all checks are complete', () => {
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

    expect(screen.getByText('Verificado presencialmente')).toBeInTheDocument();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', 'Información verificada en persona');
    expect(within(verificationBlock).getByText('Información verificada en persona')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Ubicación, anfitrión y datos confirmados')).toBeInTheDocument();
    expect(within(verificationBlock).queryByText('Verificación visible')).toBeNull();
    expect(within(verificationBlock).queryByText('5 comprobaciones visibles')).toBeNull();
    expect(within(verificationBlock).queryByRole('list')).toBeNull();
    expect(screen.queryByText('(5/5)')).toBeNull();
    expect(screen.queryByText('Más verificado')).toBeNull();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('forces the premium card model when all five checks are complete even without presencial flag', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          availabilityValidated: true,
          hasPresencialVerification: false,
        }}
      />,
    );

    expect(screen.getByText('Verificado presencialmente')).toBeInTheDocument();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', 'Información verificada en persona');
    expect(within(verificationBlock).queryByText('5 comprobaciones visibles')).toBeNull();
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

    expect(within(trustLine).getByText('4 comprobaciones visibles')).toHaveClass('text-slate-600');
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
    expect(screen.getByText('4 comprobaciones visibles')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('keeps the favorites variant free of Explore guidance labels', () => {
    render(<PropertyCard property={sampleProperty} variant="favorites" onClick={vi.fn()} />);

    const verificationBlock = screen.getByLabelText('4 comprobaciones visibles');

    expect(within(verificationBlock).getByText('4 comprobaciones visibles')).toBeInTheDocument();
    expect(within(verificationBlock).getAllByRole('listitem')).toHaveLength(5);
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
    expect(standardState.countLabel).toBe('4 comprobaciones visibles');
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

    const forcedPremiumState = getPropertyCardVerificationState({
      ...sampleProperty,
      availabilityValidated: true,
      hasPresencialVerification: false,
    });

    expect(forcedPremiumState.model).toBe('premium');
    expect(forcedPremiumState.presencialVerified).toBe(true);
    expect(forcedPremiumState.count).toBe(5);
  });
});