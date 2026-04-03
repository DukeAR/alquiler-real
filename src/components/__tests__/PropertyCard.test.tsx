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
  isVerifiedProperty: true,
};

describe('PropertyCard', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
  });

  test('renders decision-first hierarchy with trust signals and clearer CTA', () => {
    render(<PropertyCard property={sampleProperty} onClick={vi.fn()} />);

    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getByText('Santa Teresita')).toBeInTheDocument();
    expect(screen.getByText('Verificada')).toBeInTheDocument();
    expect(screen.getByText('Superanfitrión')).toBeInTheDocument();
    expect(screen.getByText('5 huéspedes')).toBeInTheDocument();
    expect(screen.getByText('Laura')).toBeInTheDocument();
    expect(screen.getByText('Precio por noche')).toBeInTheDocument();
    expect(screen.getByText('/ noche')).toBeInTheDocument();
    expect(screen.getByText('Datos claros para decidir antes de reservar.')).toBeInTheDocument();
    expect(screen.getByText('Ver detalle')).toBeInTheDocument();
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
});