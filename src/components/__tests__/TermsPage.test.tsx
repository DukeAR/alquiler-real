import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TermsPage } from '../TermsPage';

describe('TermsPage', () => {
  test('renders the platform responsibility clauses with a back action', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <TermsPage onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Términos y condiciones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lo esencial en 1 minuto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lo que conviene tener claro antes de reservar o publicar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué cambia según dónde se haga la seña' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Responsabilidades, acuerdos y uso de la plataforma' })).toBeInTheDocument();
    expect(screen.getByText('Qué hace Alquiler Real')).toBeInTheDocument();
    expect(screen.getByText('Lo que muestra cada aviso')).toBeInTheDocument();
    expect(screen.getByText('Qué responde cada anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Qué pasa si la seña o el acuerdo relevante quedan dentro de la app')).toBeInTheDocument();
    expect(screen.getByText('Qué queda fuera de Alquiler Real')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver privacidad/i })).toHaveAttribute('href', '/privacy');

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});