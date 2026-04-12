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

    expect(screen.getByText('Publica tu propiedad en pocos pasos')).toBeInTheDocument();
    expect(screen.getByText('14%')).toBeInTheDocument();
    expect(screen.getByText('6 pasos más hasta publicar.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fotos' })).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  test('publishes a first property through the exact 7-step guided flow', async () => {
    const onComplete = vi.fn();
    apiJsonMock.mockResolvedValueOnce({ id: 'prop-1' });

    render(<PropertyUploadForm onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText('Foto 1'), {
      target: { value: 'https://example.com/front.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Foto 2'), {
      target: { value: 'https://example.com/living.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Foto 3'), {
      target: { value: 'https://example.com/room.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Foto 4'), {
      target: { value: 'https://example.com/bath.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    fireEvent.click(screen.getByRole('button', { name: /Santa Teresita/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.click(screen.getByRole('button', { name: /Habitación/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.change(screen.getByLabelText('Personas'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Camas'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.change(screen.getByLabelText('Precio por noche'), {
      target: { value: '120000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.change(screen.getByLabelText('¿Qué van a encontrar apenas llegan?'), {
      target: { value: 'A dos cuadras de la playa y cerca del centro.' },
    });
    fireEvent.change(screen.getByLabelText('¿Qué hace cómodo el lugar?'), {
      target: { value: 'Habitación luminosa con placard y buena ventilación.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Publicar propiedad' }));

    await waitFor(() => expect(apiJsonMock).toHaveBeenCalledWith('/api/properties', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse(String(apiJsonMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      title: 'Habitación para 2 personas en Santa Teresita',
      location: 'Santa Teresita',
      price: 120000,
      imageUrl: 'https://example.com/front.jpg',
      images: [
        'https://example.com/front.jpg',
        'https://example.com/living.jpg',
        'https://example.com/room.jpg',
        'https://example.com/bath.jpg',
      ],
      maxGuests: 2,
      beds: 1,
      propertyType: 'room',
    });

    expect(await screen.findByText('Ya esta activa')).toBeInTheDocument();
    expect(screen.getByText('Tu publicacion ya esta activa')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Publicacion creada',
      'Tu publicacion ya esta activa. Desde el panel podes mejorarla para que se entienda mejor y reciba mas consultas.',
      'success',
    );
    expect(screen.getByText('Recibí más consultas con mejores fotos')).toBeInTheDocument();
    expect(screen.getByText('Generá más confianza con identidad y video')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mejorar publicacion' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('blocks the flow until there are at least 4 photos', () => {
    render(<PropertyUploadForm onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Foto 1'), {
      target: { value: 'https://example.com/front.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Foto 2'), {
      target: { value: 'https://example.com/living.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Foto 3'), {
      target: { value: 'https://example.com/room.jpg' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(showToastMock).toHaveBeenCalledWith(
      'Falta un paso',
      'Sumá al menos 4 fotos claras para publicar.',
      'warning',
    );
    expect(screen.getByRole('heading', { name: 'Fotos' })).toBeInTheDocument();
  });
});
