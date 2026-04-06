import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { FAQPage } from '../FAQPage';

describe('FAQPage', () => {
  test('renders the clarified structure and keeps practical sections for hosts and guests', () => {
    const onBack = vi.fn();

    render(<FAQPage onBack={onBack} />);

    expect(screen.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué mostramos y qué no damos por hecho' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preguntas que conviene resolver antes de reservar o publicar' })).toBeInTheDocument();
    expect(screen.getByText('Mostrá lo importante antes del chat')).toBeInTheDocument();
    expect(screen.getByText('Sabé qué revisar antes de reservar')).toBeInTheDocument();
    expect(screen.getByText('¿Quién maneja el pago?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
