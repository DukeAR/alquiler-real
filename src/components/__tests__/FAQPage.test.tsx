import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FAQPage } from '../FAQPage';

describe('FAQPage', () => {
  test('renders the clarified structure and keeps practical sections for hosts and guests', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <FAQPage onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué mostramos y qué no damos por hecho' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué hace Alquiler Real, qué deja registrado y qué no controla' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preguntas que conviene resolver antes de reservar o publicar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver términos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver privacidad/i })).toBeInTheDocument();
    expect(screen.getByText('Elegí bien el modelo antes de aceptar')).toBeInTheDocument();
    expect(screen.getByText('Antes de pagar, revisá qué modelo elegiste')).toBeInTheDocument();
    expect(screen.getByText('¿Cómo se calcula la seña si la registrás en la app?')).toBeInTheDocument();
    expect(screen.getByText('¿Qué pasa con un cargo de servicio si existe?')).toBeInTheDocument();
    expect(screen.getByText('¿Qué hacen con los documentos o selfies que se cargan para validar?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
