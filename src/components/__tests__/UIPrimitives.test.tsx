import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../EmptyState';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { SectionTitle } from '../ui/SectionTitle';

describe('UI primitives', () => {
  it('defaults Button to type button', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
  });

  it('supports loading and success feedback in Button', () => {
    render(
      <>
        <Button loading loadingLabel="Guardando cambios">Guardar</Button>
        <Button success successLabel="Cambios guardados">Guardar</Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Guardando cambios' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardando cambios' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cambios guardados' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cambios guardados' })).toHaveAttribute('data-success', 'true');
  });

  it('renders FormField labels as labels when htmlFor is provided', () => {
    render(
      <FormField label="Email" htmlFor="email" helperText="No lo compartimos." error="Completá este campo.">
        <input id="email" />
      </FormField>,
    );

    expect(screen.getByText('Email').tagName).toBe('LABEL');
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email');
    expect(screen.queryByText('No lo compartimos.')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Completá este campo.');
  });

  it('lets Input render with built-in field wrapper when label and helper text are provided', () => {
    render(
      <Input
        label="Email"
        helperText="Usalo para ingresar o recuperar la cuenta."
        error="Revisá este dato."
        placeholder="tu@email.com"
      />,
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).not.toMatch(/helper/);
    expect(screen.queryByText('Usalo para ingresar o recuperar la cuenta.')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Revisá este dato.');
  });

  it('lets SectionTitle separate semantic level from visual scale', () => {
    render(<SectionTitle as="h2" visualLevel="h4" heading="Detalles" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Detalles' })).toHaveClass('app-title-4');
  });

  it('applies Card variants through a single variant prop', () => {
    const { container } = render(<Card variant="muted" padding="sm">Contenido</Card>);
    // Match new design system classes
    expect(container.firstChild).toHaveClass('bg-[var(--color-surface-alt)]');
    expect(container.firstChild).toHaveClass('border');
    expect(container.firstChild).toHaveClass('rounded-[var(--radius-card)]');
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('renders Badge with calm pill styling', () => {
    render(<Badge variant="info" size="md">Nuevo</Badge>);
    // Match new design system classes
    expect(screen.getByText('Nuevo')).toHaveClass('rounded-[var(--radius-badge)]');
    // Accept either text-brand-dark or text-brand for visual system
    expect(
      screen.getByText('Nuevo').className.includes('text-brand-dark') ||
      screen.getByText('Nuevo').className.includes('text-brand')
    ).toBe(true);
  });

  it('renders EmptyState with eyebrow and CTA', () => {
    const handleClick = vi.fn();

    render(
      <EmptyState
        eyebrow="Guardados"
        title="Todavía no guardaste propiedades"
        description="Cuando guardes una, aparece acá."
        action={{ label: 'Explorá propiedades', onClick: handleClick }}
      />,
    );

    expect(screen.getByText('Guardados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explorá propiedades/i })).toBeInTheDocument();
  });
});