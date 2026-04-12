import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPage } from '../PrivacyPage';

describe('PrivacyPage', () => {
  test('renders privacy summaries and the terms shortcut', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <PrivacyPage onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Política de privacidad y datos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumen rápido de privacidad' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Uso de datos, documentos y material sensible' })).toBeInTheDocument();
    expect(screen.getByText('Qué datos recibimos')).toBeInTheDocument();
    expect(screen.getByText('Qué información puede recibir la plataforma')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver términos/i })).toHaveAttribute('href', '/terms');

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});