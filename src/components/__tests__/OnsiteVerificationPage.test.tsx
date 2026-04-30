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
    expect(screen.getByRole('heading', { name: 'La verificación reduce dudas antes de reservar.' })).toBeInTheDocument();
    expect(screen.getByText('Confirmamos que la propiedad existe y que hay una persona identificada con acceso al lugar.')).toBeInTheDocument();
    expect(screen.getAllByText('Identidad del anfitrión verificada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acceso real a la propiedad confirmado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vínculo comprobable con el lugar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación validada durante visita').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Quiero verificar mi propiedad' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ver cómo funciona' })).toBeInTheDocument();
    expect(screen.getByText('Se coordina una visita, no lleva más de unos minutos.')).toBeInTheDocument();
    expect(screen.getByText('Las propiedades verificadas se destacan automáticamente en los resultados.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué cambia cuando verificás' })).toBeInTheDocument();
    expect(screen.getByText('La propiedad existe')).toBeInTheDocument();
    expect(screen.getByText('Hay una persona identificada detrás')).toBeInTheDocument();
    expect(screen.getByText('Menor riesgo de fraude')).toBeInTheDocument();
    expect(screen.getByText('Mayor confianza para decidir')).toBeInTheDocument();
    expect(screen.getByText('Esto impacta directamente en cómo te contactan y qué tipo de consultas recibís.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué revisa esta verificación' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué validamos' })).toBeInTheDocument();
    expect(screen.getAllByText('Identidad del anfitrión verificada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acceso real a la propiedad confirmado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vínculo comprobable con el lugar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación validada durante visita').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Qué no validamos' })).toBeInTheDocument();
    expect(screen.getByText('Estado del inmueble')).toBeInTheDocument();
    expect(screen.getByText('Calidad de los servicios')).toBeInTheDocument();
    expect(screen.getByText('Condiciones técnicas del lugar')).toBeInTheDocument();
    expect(screen.getByText('No evaluamos estado ni calidad del inmueble.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Cómo es la visita' })).toBeInTheDocument();
    expect(screen.getAllByText('Identidad del anfitrión verificada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acceso real a la propiedad confirmado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vínculo comprobable con el lugar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ubicación validada durante visita').length).toBeGreaterThan(0);
    expect(screen.getByText('No se realiza inspección técnica ni evaluación de condiciones del inmueble.')).toBeInTheDocument();
    expect(screen.getByText('No necesitás preparar nada. Solo mostrar la propiedad y acreditar tu vínculo.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Quién verifica' })).toBeInTheDocument();
    expect(screen.getByText('La verificación la realiza una persona del equipo o un verificador autorizado por la plataforma.')).toBeInTheDocument();
    expect(screen.getByText('Se identifica antes de la visita')).toBeInTheDocument();
    expect(screen.getByText('Coordina previamente')).toBeInTheDocument();
    expect(screen.getByText('No solicita pagos ni datos sensibles')).toBeInTheDocument();
    expect(screen.getByText('La validación queda registrada dentro de la plataforma.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Un respaldo visible desde el primer vistazo' })).toBeInTheDocument();
    expect(screen.getByText('Indica que la propiedad fue visitada en persona y que el anfitrión fue identificado.')).toBeInTheDocument();
    expect(screen.getByText('Es lo primero que ve un huésped al comparar opciones.')).toBeInTheDocument();
    expect(screen.getByText('No certifica estado, calidad ni condiciones del inmueble.')).toBeInTheDocument();
    expect(screen.getByAltText('Sello Verificado presencialmente')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'En cuatro pasos' })).toBeInTheDocument();
    expect(screen.getByText('El proceso es simple y lo coordinamos con vos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 1: Publicás tu propiedad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 2: Coordinamos la visita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 3: Validamos identidad y acceso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paso 4: Recibís el sello' })).toBeInTheDocument();
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
    expect(screen.getByText('Coordinamos la visita en pocos pasos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});