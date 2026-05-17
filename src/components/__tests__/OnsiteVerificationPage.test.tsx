import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { OnsiteVerificationPage } from '../OnsiteVerificationPage';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

describe('OnsiteVerificationPage', () => {
  test('renders the verification landing with clear sections and keeps the back action', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <OnsiteVerificationPage onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Verificación presencial' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'La verificación presencial deja un protocolo claro.' })).toBeInTheDocument();
    expect(screen.getByText('Confirmamos existencia física de la propiedad, coincidencia general con la publicación, ubicación real, acceso real del anfitrión e identidad básica durante una visita presencial.')).toBeInTheDocument();
    expect(screen.getAllByText('Existencia física de la propiedad').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Coincidencia general con la publicación').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación real').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acceso real del anfitrión').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Identidad básica del anfitrión').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Quiero verificar mi propiedad' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ver cómo funciona' })).toBeInTheDocument();
    expect(screen.getByText('Usamos “Verificado presencialmente” solo cuando la revisión queda aprobada.')).toBeInTheDocument();
    expect(screen.getByText('Operativo · Escalable · Legalmente consistente.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué deja registrado el protocolo' })).toBeInTheDocument();
    expect(screen.getAllByText('Foto de fachada o acceso').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Foto de ingreso o interior principal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Geolocalización').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Timestamp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Estado de validación').length).toBeGreaterThan(0);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Requiere revisión')).toBeInTheDocument();
    expect(screen.getByText('Vigencia recomendada: 6 meses. Después: requiere reverificación.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué entra y qué queda afuera' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué validamos' })).toBeInTheDocument();
    expect(screen.getAllByText('Existencia física de la propiedad').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Coincidencia general con la publicación').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación real').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acceso real del anfitrión').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Identidad básica del anfitrión').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Qué no validamos' })).toBeInTheDocument();
    expect(screen.getByText('Calidad del inmueble')).toBeInTheDocument();
    expect(screen.getByText('Limpieza')).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByText('Funcionamiento técnico')).toBeInTheDocument();
    expect(screen.getByText('Seguridad edilicia')).toBeInTheDocument();
    expect(screen.getByText('Exactitud absoluta de fotos')).toBeInTheDocument();
    expect(screen.getAllByText('No verificamos calidad del inmueble, limpieza, amenities, funcionamiento técnico, seguridad edilicia ni exactitud absoluta de fotos.').length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: 'Cómo se valida' })).toBeInTheDocument();
    expect(screen.getAllByText('Foto de fachada o acceso').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Foto de ingreso o interior principal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Geolocalización').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Timestamp').length).toBeGreaterThan(0);
    expect(screen.getByText('La aprobación final depende de revisar la evidencia mínima y cerrar el estado operativo.')).toBeInTheDocument();
    expect(screen.getByText('No necesitás preparar nada más que mostrar la propiedad y acreditar tu vínculo básico con el aviso.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Enfoque y copy' })).toBeInTheDocument();
    expect(screen.getByText('La verificación la realiza una persona del equipo o un verificador autorizado por la plataforma siguiendo un protocolo operativo y repetible.')).toBeInTheDocument();
    expect(screen.getByText('Se identifica antes de la visita')).toBeInTheDocument();
    expect(screen.getByText('Coordina previamente')).toBeInTheDocument();
    expect(screen.getByText('No solicita pagos ni datos sensibles')).toBeInTheDocument();
    expect(screen.getByText('Duración recomendada: 6 meses')).toBeInTheDocument();
    expect(screen.getByText('Copy visible: Verificado presencialmente')).toBeInTheDocument();
    expect(screen.getByText('No usamos “certificado”, “garantizado”, “inspeccionado”.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Un respaldo visible desde el primer vistazo' })).toBeInTheDocument();
    expect(screen.getByText('Mostramos “Verificado presencialmente” solo cuando el estado queda aprobado después de revisar la evidencia mínima.')).toBeInTheDocument();
    expect(screen.getByText('La vigencia recomendada es de 6 meses. Después corresponde marcar requiere reverificación.')).toBeInTheDocument();
    expect(screen.getAllByText('No verificamos calidad del inmueble, limpieza, amenities, funcionamiento técnico, seguridad edilicia ni exactitud absoluta de fotos.').length).toBeGreaterThan(0);
    expect(screen.getByAltText('Sello Verificado presencialmente')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'En cuatro pasos' })).toBeInTheDocument();
    expect(screen.getByText('El proceso es simple, repetible y deja un estado operativo claro.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 1: Publicás tu propiedad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 2: Coordinamos la visita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 3: Registramos evidencia mínima' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 4: Cerramos el estado' })).toBeInTheDocument();
    let tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('Publicás tu propiedad')).toBeInTheDocument();
    expect(within(tooltip).getByText('Cargás la información básica del aviso para que sea visible.')).toBeInTheDocument();
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Paso 1: Publicás tu propiedad' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Paso 2: Coordinamos la visita' }));

    tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('Coordinamos la visita')).toBeInTheDocument();
    expect(within(tooltip).getByText('Elegís día y horario para la verificación.')).toBeInTheDocument();
    expect(screen.queryByText('Cargás la información básica del aviso para que sea visible.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Paso 2: Coordinamos la visita' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Paso 1: Publicás tu propiedad' })).toHaveAttribute('aria-pressed', 'false');

    expect(screen.queryByRole('heading', { name: 'Lo que mejora cuando verificás' })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Cómo funciona en la práctica' })).toBeInTheDocument();
    expect(screen.getByText('Próximamente guía completa')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Empezá la verificación y destacá tu propiedad' })).toBeInTheDocument();
    expect(screen.getByText('Coordinamos la visita y cerramos la revisión con evidencia mínima.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});