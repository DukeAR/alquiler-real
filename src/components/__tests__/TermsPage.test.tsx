import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { TermsPage } from '../TermsPage';

describe('TermsPage', () => {
  test('renders the platform responsibility clauses with a back action', () => {
    const onBack = vi.fn();

    render(<TermsPage onBack={onBack} />);

    expect(screen.getByRole('heading', { name: 'Términos y condiciones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lo esencial en 1 minuto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Responsabilidades, acuerdos y uso de la plataforma' })).toBeInTheDocument();
    expect(screen.getByText('Lo que muestra cada aviso')).toBeInTheDocument();
    expect(screen.getByText('Cuándo no interviene')).toBeInTheDocument();
    expect(screen.getByText('Qué responde cada anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Cuándo puede intervenir la plataforma')).toBeInTheDocument();
    expect(screen.getByText('Qué queda fuera de Alquiler Real')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});