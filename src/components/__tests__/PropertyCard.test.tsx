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
  hasPresencialVerification: true,
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

  test('renders the real verification summary without turning it into a promotional sticker', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        verificationGuidanceLabel="Más comprobado"
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
    expect(screen.getByText('Más comprobado')).toBeInTheDocument();
    const verificationBlock = screen.getByTestId('property-card-verification');
    expect(verificationBlock).toHaveAttribute('aria-label', '4 de 5 comprobaciones');
    expect(within(verificationBlock).getByText('4/5 verificado')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('● ● ● ● ○')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Ubicación · Anfitrión · Datos')).toBeInTheDocument();
    expect(within(verificationBlock).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(verificationBlock).queryByText(/^Fotos$/)).toBeNull();
    expect(within(verificationBlock).queryByText(/^Precio$/)).toBeNull();
    expect(screen.queryByText('Confianza visible')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('12 reseñas reales')).toBeNull();
    expect(screen.queryByText('Anfitrión: Laura')).toBeNull();
    expect(screen.queryByText('Abrir ficha')).toBeNull();
    expect(screen.queryByText('Ver detalle')).toBeNull();
    expect(screen.getByRole('button', { name: /Abrir detalle de Casa frente al mar/i })).toBeInTheDocument();
  });

  test('shows only the score when the real verification level is still low', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          identityValidated: false,
          verificationPhotoCount: 0,
          propertyRelationshipVerified: false,
          hasPresencialVerification: false,
          isSuperHost: false,
        }}
      />,
    );

    const verificationBlock = screen.getByLabelText('3 de 5 comprobaciones');

    expect(within(verificationBlock).getByText('3/5 verificado')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('● ● ● ○ ○')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Ubicación · Datos')).toBeInTheDocument();
    expect(within(verificationBlock).queryByText(/^Anfitrión$/)).toBeNull();
    expect(within(verificationBlock).queryByText(/^Fotos$/)).toBeNull();
    expect(screen.queryByText('Más comprobado')).toBeNull();
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
    expect(screen.getByText('Ubicación · Anfitrión · Datos')).toBeInTheDocument();
  });

  test('shows the subtle high-verification badge automatically when the score reaches 4', () => {
    render(
      <PropertyCard
        property={sampleProperty}
      />,
    );

    expect(screen.getByText('Más comprobado')).toBeInTheDocument();
    expect(screen.getByText('4/5 verificado')).toBeInTheDocument();
  });

  test('makes the verification line slightly more visible without turning it into a heavy green block', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        emphasizeVerification
      />,
    );

    const trustLine = screen.getByTestId('property-card-verification');

    expect(within(trustLine).getByText('4/5 verificado')).toHaveClass('text-emerald-800');
  });

  test('shows the featured badge without extra support copy when the card is highlighted as the most reliable option', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        decisionFeatured
        decisionSupportLabel="Buena relación precio / información"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Más confiable')).toBeInTheDocument();
    expect(screen.queryByText('Buena relación precio / información')).toBeNull();
    expect(screen.queryByText('Más comprobado')).toBeNull();
  });

  test('keeps the favorites variant free of Explore guidance labels', () => {
    render(<PropertyCard property={sampleProperty} variant="favorites" onClick={vi.fn()} />);

    const verificationBlock = screen.getByLabelText('4 de 5 comprobaciones');

    expect(within(verificationBlock).getByText('4/5 verificado')).toBeInTheDocument();
    expect(within(verificationBlock).getByText('Ubicación · Anfitrión · Datos')).toBeInTheDocument();
    expect(screen.queryByText('Más comprobado')).toBeNull();
    expect(screen.queryByText('Más confiable')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('Abrir ficha')).toBeNull();
    expect(screen.queryByText('Abrir detalle')).toBeNull();
    expect(screen.queryByText('Ver detalle')).toBeNull();
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
});