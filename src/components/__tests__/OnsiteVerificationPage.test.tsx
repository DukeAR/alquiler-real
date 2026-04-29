import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'Más confianza. Mejores reservas.' })).toBeInTheDocument();
    expect(screen.getByText('Verificamos en persona identidad y vínculo con la propiedad.')).toBeInTheDocument();
    expect(screen.getByText('Propiedad real')).toBeInTheDocument();
    expect(screen.getByText('Anfitrión identificado')).toBeInTheDocument();
    expect(screen.getByText('Menor riesgo')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Iniciar verificación' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ver cómo funciona' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué cambia cuando verificás' })).toBeInTheDocument();
    expect(screen.getByText('La propiedad existe')).toBeInTheDocument();
    expect(screen.getByText('Hay una persona identificada detrás')).toBeInTheDocument();
    expect(screen.getByText('Menor riesgo de fraude')).toBeInTheDocument();
    expect(screen.getByText('Mayor confianza para decidir')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué revisa esta verificación' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué validamos' })).toBeInTheDocument();
    expect(screen.getByText('Identidad del anfitrión (DNI)')).toBeInTheDocument();
    expect(screen.getByText('Acceso real a la propiedad')).toBeInTheDocument();
    expect(screen.getByText('Relación con la propiedad (servicios o documentación)')).toBeInTheDocument();
    expect(screen.getByText('Coincidencia básica con la ubicación publicada')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué no validamos' })).toBeInTheDocument();
    expect(screen.getByText('Estado del inmueble')).toBeInTheDocument();
    expect(screen.getByText('Calidad de los servicios')).toBeInTheDocument();
    expect(screen.getByText('Condiciones técnicas del lugar')).toBeInTheDocument();
    expect(screen.getByText('No evaluamos el estado del inmueble ni la calidad de los servicios.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Cómo es la visita' })).toBeInTheDocument();
    expect(screen.getByText('Validación de identidad (DNI)')).toBeInTheDocument();
    expect(screen.getByText('Confirmación de acceso a la propiedad')).toBeInTheDocument();
    expect(screen.getByText('Verificación de vínculo con el lugar')).toBeInTheDocument();
    expect(screen.getByText('Coincidencia con la ubicación publicada')).toBeInTheDocument();
    expect(screen.getByText('No se realiza inspección técnica ni evaluación de condiciones del inmueble.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Quién verifica' })).toBeInTheDocument();
    expect(screen.getByText('La verificación la realiza una persona del equipo o un verificador autorizado por la plataforma.')).toBeInTheDocument();
    expect(screen.getByText('Se identifica antes de la visita')).toBeInTheDocument();
    expect(screen.getByText('Coordina previamente')).toBeInTheDocument();
    expect(screen.getByText('No solicita pagos ni datos sensibles')).toBeInTheDocument();
    expect(screen.getByText('La validación queda registrada dentro de la plataforma.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Un respaldo visible desde el primer vistazo' })).toBeInTheDocument();
    expect(screen.getByText('Indica que la propiedad fue visitada en persona y que el anfitrión fue identificado.')).toBeInTheDocument();
    expect(screen.getByText('No certifica estado, calidad ni condiciones del inmueble.')).toBeInTheDocument();
    expect(screen.getByAltText('Sello Verificado presencialmente')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'En cuatro pasos' })).toBeInTheDocument();
    expect(screen.getByText('Publicás')).toBeInTheDocument();
    expect(screen.getByText('Coordinamos la visita')).toBeInTheDocument();
    expect(screen.getByText('Validamos')).toBeInTheDocument();
    expect(screen.getByText('Recibís el sello')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Lo que mejora cuando verificás' })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Cómo funciona en la práctica' })).toBeInTheDocument();
    expect(screen.getByText('Próximamente guía completa')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Verificá tu propiedad y destacate desde el primer vistazo.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});