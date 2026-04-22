import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { AboutPage } from '../AboutPage';

describe('AboutPage', () => {
  test('renders the clearer sections, lets users switch tabs, and keeps the back action', async () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <AboutPage onBack={onBack} />
      </MemoryRouter>,
    );

      expect(screen.queryByText('ANTES DE RESERVAR')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).toBeInTheDocument();
    expect(screen.getByText('No todos los avisos muestran lo mismo. Acá ves qué está verificado y qué no.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alquilar hoy es una apuesta.' })).toBeInTheDocument();
    expect(screen.getByText('No sabés si las fotos son reales.')).toBeInTheDocument();
    expect(screen.getByText('No sabés si la ubicación cierra.')).toBeInTheDocument();
    expect(screen.getByText('No sabés si lo que ves es lo que vas a encontrar.')).toBeInTheDocument();
    expect(screen.getByText(/Es no saber qué estás reservando\./)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué ya está comprobado' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación real')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué todavía evaluás vos' })).toBeInTheDocument();
    expect(screen.getByText('Por eso, mostramos lo importante desde el principio.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué significa que algo esté verificado' })).toBeInTheDocument();
    expect(screen.getByText('Alguien fue al lugar y confirmó que existe.')).toBeInTheDocument();
    expect(screen.getByText('Información validada online.')).toBeInTheDocument();
    expect(screen.getByText('Aunque esté verificado, siguen importando las fotos, el precio, las reglas y las reseñas.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Esto recién empieza' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Más claridad en cada aviso' })).toBeInTheDocument();
    expect(screen.getByText('Menos dudas antes de escribir o reservar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Más cosas verificadas' })).toBeInTheDocument();
    expect(screen.getByText('Cada aviso muestra mejor qué es real')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Decidir más rápido' })).toBeInTheDocument();
    expect(screen.getByText('Menos vueltas, más certeza')).toBeInTheDocument();
    expect(screen.queryByText('Qué revisar además')).not.toBeInTheDocument();
    expect(screen.queryByText('Lo que sigue siendo tu decisión')).not.toBeInTheDocument();
    expect(screen.queryByText('Esto no cambia')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Anfitriones' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'No solo publicás mejor. También elegís con más información.' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Más contexto para decidir con criterio' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Huéspedes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Qué mirar antes de reservar' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Explorá sabiendo qué ya fue comprobado' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
