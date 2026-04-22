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

    expect(screen.getByRole('heading', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getByText('ANTES DE RESERVAR')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).toBeInTheDocument();
    expect(screen.getByText('No todos los avisos muestran lo mismo. Acá ves qué está verificado y qué no.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alquilar hoy es una apuesta.' })).toBeInTheDocument();
    expect(screen.getByText('Ves fotos. Leés descripciones. Preguntás.')).toBeInTheDocument();
    expect(screen.getByText('Pero no sabés con certeza qué estás reservando.')).toBeInTheDocument();
    expect(screen.getByText('La ubicación a veces no coincide. Las fotos pueden ser viejas. Y las condiciones cambian cuando empezás a hablar.')).toBeInTheDocument();
    expect(screen.getByText('El problema no es reservar. Es decidir sin saber.')).toBeInTheDocument();
    expect(screen.getByText('Alquiler Real existe para cambiar eso. Mostrarte, desde el principio, qué parte del aviso está realmente comprobada. Y qué no.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué ya está comprobado' })).toBeInTheDocument();
    expect(screen.getByText('Ubicación real')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué sigue dependiendo de vos' })).toBeInTheDocument();
    expect(screen.getByText('Por eso, en cada publicación diferenciamos dos cosas:')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué significa que algo esté verificado' })).toBeInTheDocument();
    expect(screen.getByText('Alguien fue al lugar y confirmó que existe y coincide.')).toBeInTheDocument();
    expect(screen.getByText('Información cargada y validada por quien publica.')).toBeInTheDocument();
    expect(screen.getByText('Aunque esté verificado, hay cosas que siguen siendo decisión tuya: precio, reglas y experiencias de otros.')).toBeInTheDocument();
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
    expect(screen.queryByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Huéspedes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Qué mirar antes de reservar' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Explorá sabiendo qué ya fue comprobado' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Proyecto' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
