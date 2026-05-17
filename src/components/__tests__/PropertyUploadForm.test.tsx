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

    expect(screen.getByText('Alta guiada')).toBeInTheDocument();
    expect(screen.getByText('Publica tu propiedad en pocos pasos')).toBeInTheDocument();
    expect(screen.getByText('Te pedimos solo lo justo para activarla rapido. Despues la mejoras desde el panel para que el aviso sea mas claro y reciba mas consultas.')).toBeInTheDocument();
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('5 pasos más hasta publicar.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fotos' })).toBeInTheDocument();
    expect(screen.getByText('Publicar')).toBeInTheDocument();
    expect(screen.getByText('Protocolo base de verificación presencial')).toBeInTheDocument();
    expect(screen.getByText('Usamos una validación operativa, escalable y legalmente consistente para dejar claro qué verifica la plataforma, qué evidencia mínima se registra y cuándo corresponde reverificar.')).toBeInTheDocument();
  });

  test('publishes a first property through the compact guided flow', async () => {
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
      ],
      maxGuests: 2,
      beds: 1,
      propertyType: 'room',
      description: '',
    });

    expect(await screen.findByText('Ya esta activa')).toBeInTheDocument();
    expect(screen.getByText('Tu publicacion ya esta activa')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(
      'Publicacion creada',
      'Tu publicacion ya esta activa. Desde el panel podes mejorarla para que se entienda mejor y reciba mas consultas.',
      'success',
    );
    expect(screen.getByText('Recibí más consultas con mejores fotos')).toBeInTheDocument();
    expect(screen.getByText('Sumá verificación presencial con un protocolo claro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mejorar publicacion' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('allows requesting onsite verification directly from the published listing screen', async () => {
    apiJsonMock
      .mockResolvedValueOnce({ id: 'prop-1' })
      .mockResolvedValueOnce({ redirectTo: '/verification?mode=onsite&propertyId=prop-1&returnTo=/host-dashboard' });

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

    fireEvent.click(screen.getByRole('button', { name: /Santa Teresita/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: /Casa/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Publicar propiedad' }));

    expect(await screen.findByText('Tu publicacion ya esta activa')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar verificacion presencial' }));

    await waitFor(() => expect(apiJsonMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(apiJsonMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      offerType: 'onsite-property',
      propertyId: 'prop-1',
      requestSource: 'listing',
    });
    expect(await screen.findByRole('button', { name: 'Continuar verificacion presencial' })).toBeInTheDocument();
  });

  test('blocks the flow until there are at least 3 photos', () => {
    render(<PropertyUploadForm onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Foto 1'), {
      target: { value: 'https://example.com/front.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Foto 2'), {
      target: { value: 'https://example.com/living.jpg' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(showToastMock).toHaveBeenCalledWith(
      'Falta un paso',
      'Sumá al menos 3 fotos claras para avanzar.',
      'warning',
    );
    expect(screen.getByRole('heading', { name: 'Fotos' })).toBeInTheDocument();
  });

  test('shows soft quality suggestions without blocking the preview', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Santa Teresita/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.click(screen.getByRole('button', { name: /Departamento/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    await waitFor(() => expect(screen.getByText('Sugerencias suaves antes de publicar')).toBeInTheDocument());

    expect(screen.getByText('Sumá una cuarta foto cuando puedas')).toBeInTheDocument();
    expect(screen.getByText('Agregá barrio o una referencia simple')).toBeInTheDocument();
    expect(screen.getByText('Sumá una frase corta sobre llegada o comodidad')).toBeInTheDocument();
  });

  test('guides titles away from marketing and excessive emphasis', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Santa Teresita/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: /Casa/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    await waitFor(() => expect(screen.getByLabelText('Título')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'INCREIBLE 😍' },
    });

    expect(screen.getByText('Conviene ajustar el título antes de salir.')).toBeInTheDocument();
    expect(screen.getAllByText('Evitá emojis para que el título se vea más claro y confiable.').length).toBeGreaterThan(0);
    expect(screen.getByText('“PH con patio cerca del mar”')).toBeInTheDocument();
  });
});
