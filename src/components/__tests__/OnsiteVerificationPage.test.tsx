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
    expect(screen.getByText('Las propiedades verificadas reciben consultas más claras, menos fricción y decisiones más rápidas.')).toBeInTheDocument();
    expect(screen.getByText('Revisamos tu propiedad en persona y validamos la información clave del aviso.')).toBeInTheDocument();
    expect(screen.getByText('Más visibilidad')).toBeInTheDocument();
    expect(screen.getByText('Consultas más claras')).toBeInTheDocument();
    expect(screen.getByText('Menos fricción')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Iniciar verificación' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Cómo funciona' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Publicar sin validar genera dudas.' })).toBeInTheDocument();
    expect(screen.getByText('La verificación elimina fricción y mejora la calidad de las reservas.')).toBeInTheDocument();
    expect(screen.getByText('Menos consultas irrelevantes')).toBeInTheDocument();
    expect(screen.getByText('Decisiones más rápidas')).toBeInTheDocument();
    expect(screen.getByText('Reservas más concretas')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué validamos' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación confirmada')).toBeInTheDocument();
    expect(screen.getByText('Fotos reales')).toBeInTheDocument();
    expect(screen.getByText('Datos validados')).toBeInTheDocument();
    expect(screen.getByText('Servicios comprobados')).toBeInTheDocument();
    expect(screen.getByText('Condiciones verificadas')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Sello Verificado presencialmente' })).toBeInTheDocument();
    expect(screen.getByText('Confirma que la propiedad fue revisada en persona y suma respaldo visible en el aviso.')).toBeInTheDocument();
    expect(screen.getByAltText('Sello Verificado presencialmente')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Un proceso corto y claro' })).toBeInTheDocument();
    expect(screen.getByText('Publicás tu propiedad')).toBeInTheDocument();
    expect(screen.getByText('Coordinamos la visita')).toBeInTheDocument();
    expect(screen.getByText('Validamos la información clave')).toBeInTheDocument();
    expect(screen.getByText('Se activa el sello presencial')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Lo que mejora cuando verificás' })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Próximamente guía completa' })).toBeInTheDocument();
    expect(screen.getAllByText('Próximamente guía completa')).toHaveLength(2);

    expect(screen.getByRole('heading', { name: 'Verificá tu propiedad.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});