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
    expect(screen.getByText('Un verificador revisa tu propiedad en persona y valida la información clave del aviso.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Quiero verificar mi propiedad' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ver cómo funciona' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Publicar sin validar genera fricción.' })).toBeInTheDocument();
    expect(screen.getByText('Consultas que no avanzan')).toBeInTheDocument();
    expect(screen.getByText('Dudas constantes')).toBeInTheDocument();
    expect(screen.getByText('Tiempo perdido')).toBeInTheDocument();
    expect(screen.getByText('Reservas que se caen')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'La verificación cambia la calidad de todo.' })).toBeInTheDocument();
    expect(screen.getByText('Cuando la información está validada, el huésped decide mejor y vos filtrás mejor.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Qué validamos' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación confirmada')).toBeInTheDocument();
    expect(screen.getByText('Fotos reales')).toBeInTheDocument();
    expect(screen.getByText('Datos del aviso validados')).toBeInTheDocument();
    expect(screen.getByText('Servicios comprobados')).toBeInTheDocument();
    expect(screen.getByText('Condiciones verificadas')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Sello Verificado presencialmente' })).toBeInTheDocument();
    expect(screen.getByText('Indica que la propiedad fue revisada en persona.')).toBeInTheDocument();
    expect(screen.getByAltText('Sello Verificado presencialmente')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Un proceso corto y claro' })).toBeInTheDocument();
    expect(screen.getByText('Publicás tu propiedad')).toBeInTheDocument();
    expect(screen.getByText('Coordinamos la visita')).toBeInTheDocument();
    expect(screen.getByText('Validamos la información clave')).toBeInTheDocument();
    expect(screen.getByText('Se activa el sello presencial')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Lo que mejora cuando verificás' })).toBeInTheDocument();
    expect(screen.getAllByText('Más visibilidad')).toHaveLength(2);
    expect(screen.getAllByText('Mejores consultas')).toHaveLength(2);
    expect(screen.getAllByText('Menos fricción')).toHaveLength(2);

    expect(screen.getByRole('heading', { name: 'Próximamente guía completa' })).toBeInTheDocument();
    expect(screen.getAllByText('Próximamente guía completa')).toHaveLength(2);

    expect(screen.getByRole('heading', { name: 'Verificar mejora cómo te eligen.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});