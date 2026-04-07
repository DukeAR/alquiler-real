import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PropertyUploadForm } from '../PropertyUploadForm';

const apiJsonMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

describe('PropertyUploadForm', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
  });

  test('shows progressive steps and completion percentage', () => {
    render(<PropertyUploadForm onComplete={vi.fn()} />);

    expect(screen.getByText('Publicá tu propiedad paso a paso')).toBeInTheDocument();
    expect(screen.getByText('14%')).toBeInTheDocument();
    expect(screen.getByText('6 pasos para publicar.')).toBeInTheDocument();
    expect(screen.getByText('Tipo y ubicación')).toBeInTheDocument();
    expect(screen.getByText('Resumen')).toBeInTheDocument();
  });

  test('publishes a first property through the new step-by-step flow', async () => {
    const onComplete = vi.fn();
    apiJsonMock.mockResolvedValueOnce({ id: 'prop-1' });

    render(<PropertyUploadForm onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.change(screen.getByLabelText('Foto principal'), {
      target: { value: 'https://example.com/cover.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.change(screen.getByLabelText('Precio por noche'), {
      target: { value: '120000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.click(screen.getByRole('button', { name: /Quiero dejar una aclaración breve de disponibilidad/i }));
    fireEvent.change(screen.getByLabelText('Aclaración de disponibilidad'), {
      target: { value: 'Disponible desde diciembre y con confirmación previa.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Anotarlo' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Publicar propiedad' }));

    await waitFor(() => expect(apiJsonMock).toHaveBeenCalledWith('/api/properties', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse(String(apiJsonMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      title: 'Casa en San Clemente del Tuyú',
      location: 'San Clemente del Tuyú',
      price: 120000,
      imageUrl: 'https://example.com/cover.jpg',
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: 'house',
    });

    expect(await screen.findByText('Publicación creada')).toBeInTheDocument();
    expect(screen.getByText(/ya está publicada/i)).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Publicación creada',
      'Tu propiedad ya quedó publicada. Después podés seguir mejorándola.',
      'success',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ir al panel' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
