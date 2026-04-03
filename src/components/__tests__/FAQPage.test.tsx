import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { FAQPage } from '../FAQPage';

describe('FAQPage', () => {
  test('renders the clarified structure and keeps practical sections for hosts and guests', () => {
    const onBack = vi.fn();

    render(<FAQPage onBack={onBack} />);

    expect(screen.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué validamos y qué no' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preguntas que conviene resolver antes de avanzar' })).toBeInTheDocument();
    expect(screen.getByText('Mostrá información real desde el inicio')).toBeInTheDocument();
    expect(screen.getByText('Reservá con más criterio')).toBeInTheDocument();
    expect(screen.getByText('¿Quién maneja el pago?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
