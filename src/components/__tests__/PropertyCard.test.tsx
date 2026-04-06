import { fireEvent, render, screen } from '@testing-library/react';
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
  propertyRelationshipVerified: true,
  hasPresencialVerification: true,
  isVerifiedProperty: true,
  hostTrustScore: 4,
  hostTrust: highHostTrust,
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
        verificationGuidanceLabel="Mejor verificado"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getByText('Santa Teresita')).toBeInTheDocument();
    expect(screen.getByText('Precio por noche')).toBeInTheDocument();
    expect(screen.getByText('/ noche')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Verificación')).toBeInTheDocument();
    expect(screen.getByText('Mejor verificado')).toBeInTheDocument();
    expect(screen.getByText('4 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getByText('✔✔✔✔○')).toBeInTheDocument();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.queryByText('12 reseñas reales')).toBeNull();
    expect(screen.queryByText('Anfitrión: Laura')).toBeNull();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
  });

  test('shows only the score when the real verification level is still low', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          propertyRelationshipVerified: false,
          hasPresencialVerification: false,
          isSuperHost: false,
        }}
      />,
    );

    expect(screen.getByText('2 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getByText('✔✔○○○')).toBeInTheDocument();
    expect(screen.queryByText('Mejor verificado')).toBeNull();
    expect(screen.queryByText('Alto nivel de verificación')).toBeNull();
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
  });

  test('renders the guided high-verification label when Explore passes it', () => {
    render(
      <PropertyCard
        property={{
          ...sampleProperty,
          propertyRelationshipVerified: false,
        }}
        verificationGuidanceLabel="Alto nivel de verificación"
      />,
    );

    expect(screen.getByText('Alto nivel de verificación')).toBeInTheDocument();
    expect(screen.getByText('3 de 5 comprobaciones')).toBeInTheDocument();
  });

  test('makes the verification block slightly more visible when Explore detects sustained interest', () => {
    render(
      <PropertyCard
        property={sampleProperty}
        emphasizeVerification
      />,
    );

    const verificationBlock = screen.getByLabelText('4 de 5 comprobaciones').parentElement?.parentElement;

    expect(verificationBlock).toHaveClass('border-emerald-200/80');
    expect(screen.getByText('Verificación')).toHaveClass('text-emerald-700');
  });

  test('keeps the favorites variant free of Explore guidance labels', () => {
    render(<PropertyCard property={sampleProperty} variant="favorites" onClick={vi.fn()} />);

    expect(screen.getByText('4 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getByText('✔✔✔✔○')).toBeInTheDocument();
    expect(screen.queryByText('Mejor verificado')).toBeNull();
    expect(screen.queryByText('Alto nivel de verificación')).toBeNull();
    expect(screen.queryByText('Anfitrión con buen historial')).toBeNull();
    expect(screen.getByText('Abrir detalle')).toBeInTheDocument();
    expect(screen.queryByText('Ver detalle')).toBeNull();
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