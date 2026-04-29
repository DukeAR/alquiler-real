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
    expect(screen.getByText('Verificamos tu propiedad en persona para que recibas consultas más claras y seguras.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Iniciar verificación' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ver cómo funciona' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué cambia cuando verificás' })).toBeInTheDocument();
    expect(screen.getByText('Sin verificación')).toBeInTheDocument();
    expect(screen.getByText('Con verificación')).toBeInTheDocument();
    expect(screen.getByText('Dudas constantes')).toBeInTheDocument();
    expect(screen.getByText('Consultas que no avanzan')).toBeInTheDocument();
    expect(screen.getByText('Tiempo perdido')).toBeInTheDocument();
    expect(screen.getByText('Consultas claras')).toBeInTheDocument();
    expect(screen.getByText('Decisiones rápidas')).toBeInTheDocument();
    expect(screen.getByText('Reservas más concretas')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué validamos' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación real')).toBeInTheDocument();
    expect(screen.getByText('Fotos actuales')).toBeInTheDocument();
    expect(screen.getByText('Datos del aviso')).toBeInTheDocument();
    expect(screen.getByText('Servicios publicados')).toBeInTheDocument();
    expect(screen.getByText('Condiciones del lugar')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Sello Verificado presencialmente' })).toBeInTheDocument();
    expect(screen.getByText('Muestra de forma visible que la propiedad fue revisada en persona.')).toBeInTheDocument();
    expect(screen.getByAltText('Sello Verificado presencialmente')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'En cuatro pasos' })).toBeInTheDocument();
    expect(screen.getByText('Publicás')).toBeInTheDocument();
    expect(screen.getByText('Coordinamos la visita')).toBeInTheDocument();
    expect(screen.getByText('Validamos')).toBeInTheDocument();
    expect(screen.getByText('Recibís el sello')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Lo que mejora cuando verificás' })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Próximamente guía completa' })).toBeInTheDocument();
    expect(screen.getAllByText('Próximamente guía completa')).toHaveLength(2);

    expect(screen.getByRole('heading', { name: 'Verificar mejora cómo te eligen.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});