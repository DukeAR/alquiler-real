import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { AboutPage } from '../AboutPage';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

describe('AboutPage', () => {
  test('renders the clearer sections, lets users switch tabs, and keeps the back action', async () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <AboutPage onBack={onBack} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Te pasó de reservar un alquiler y no estar del todo tranquilo?' })).toBeInTheDocument();
    expect(screen.getByText('Mirás fotos sin saber si son actuales. Dudás si la ubicación es realmente esa. Y muchas veces no tenés claro quién está del otro lado.')).toBeInTheDocument();
    expect(screen.getByText('Eso le pasa a todo el mundo. Y cuando se trata de vacaciones, no debería ser así.')).toBeInTheDocument();
    expect(screen.getByText('No es un problema de opciones. Es un problema de confianza.')).toBeInTheDocument();
    expect(screen.getByText('Alquiler Real nace para cambiar eso: para que puedas ver, desde el principio, qué parte del aviso tiene respaldo real y qué parte sigue siendo información publicada por el anfitrión.')).toBeInTheDocument();
    expect(screen.getByText('Para que decidir no dependa de adivinar.')).toBeInTheDocument();
    expect(screen.getByText('Menos incertidumbre. Más claridad.')).toBeInTheDocument();
    expect(screen.getByText('Elegís.')).toBeInTheDocument();
    expect(screen.getByText('Hablás.')).toBeInTheDocument();
    expect(screen.getByText('Chequeás.')).toBeInTheDocument();
    expect(screen.getByText('Reservás.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alquilar hoy es una apuesta.' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ves fotos. Leés descripciones. Preguntás.')).not.toBeInTheDocument();
    expect(screen.queryByText('Pero no sabés con certeza qué estás reservando.')).not.toBeInTheDocument();
    expect(screen.queryByText('Alquilar hoy muchas veces es una apuesta. No porque falten opciones, sino porque falta información confiable para decidir.')).not.toBeInTheDocument();
    expect(screen.queryByText('Alquiler Real nace para cambiar eso: para que puedas ver, desde el principio, qué parte del aviso está realmente comprobada antes de hablar, reservar o pagar.')).not.toBeInTheDocument();
    expect(screen.queryByText('La idea es simple: menos incertidumbre, más claridad.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué podés revisar en un aviso' })).toBeInTheDocument();
    expect(screen.getByText('Si hubo verificación presencial')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué sigue dependiendo de vos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué significa cada nivel de respaldo' })).toBeInTheDocument();
    expect(screen.getByText('Confirmamos existencia física de la propiedad, coincidencia general con la publicación, ubicación real, acceso real del anfitrión e identidad básica durante una visita presencial.')).toBeInTheDocument();
    expect(screen.getByText('El aviso muestra datos cargados por quien publica, sin checks presenciales.')).toBeInTheDocument();
    expect(screen.getByText('Aunque un aviso tenga verificación presencial, hay cosas que siguen siendo decisión tuya: precio, reglas y experiencias de otros.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alquilar debería ser simple.' })).toBeInTheDocument();
    expect(screen.getByText('No debería ser una apuesta. No deberías tener que dudar de cada foto, de cada ubicación o de cada persona con la que hablás.')).toBeInTheDocument();
    expect(screen.getByText('Alquiler Real existe para eso: para que puedas elegir con información clara, hablar con más confianza y reservar sabiendo mejor dónde te estás metiendo.')).toBeInTheDocument();
    expect(screen.getByText('Menos dudas. Más tranquilidad.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Esto recién empieza' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Más claridad en cada aviso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Más cosas verificadas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Decidir más rápido' })).not.toBeInTheDocument();
    expect(screen.queryByText('Menos dudas antes de escribir o reservar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cada aviso muestra mejor qué es real')).not.toBeInTheDocument();
    expect(screen.queryByText('Menos vueltas, más certeza')).not.toBeInTheDocument();
    expect(screen.queryByText('Qué revisar además')).not.toBeInTheDocument();
    expect(screen.queryByText('Lo que sigue siendo tu decisión')).not.toBeInTheDocument();
    expect(screen.queryByText('Esto no cambia')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Anfitriones' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Elegí con quién hablar antes de aceptar una reserva.' })).toBeInTheDocument();
    });
    expect(screen.getByText('En esta plataforma no solo publicás. También ves quién te contacta, qué historial tiene y cómo se comporta.')).toBeInTheDocument();
    expect(screen.getByText('Publicar es simple y gratis. Mejorar la calidad de las consultas depende de la información que validás.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver cómo funciona' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué te ayuda a decidir antes de aceptar' })).toBeInTheDocument();
    expect(screen.getByText('Filtrar mejor a quién responder')).toBeInTheDocument();
    expect(screen.getByText('Ver historial del usuario')).toBeInTheDocument();
    expect(screen.getByText('Decidir con más contexto')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'La verificación reduce dudas antes de reservar.' })).toBeInTheDocument();
    expect(screen.getByText('Confirmamos existencia física de la propiedad, coincidencia general con la publicación, ubicación real, acceso real del anfitrión e identidad básica durante una visita presencial.')).toBeInTheDocument();
    expect(screen.getByText('Existencia física de la propiedad')).toBeInTheDocument();
    expect(screen.getByText('Coincidencia general con la publicación')).toBeInTheDocument();
    expect(screen.getByText('Ubicación real')).toBeInTheDocument();
    expect(screen.getByText('Acceso real del anfitrión')).toBeInTheDocument();
    expect(screen.getByText('Identidad básica del anfitrión')).toBeInTheDocument();
    expect(screen.getByText('No verificamos calidad del inmueble, limpieza, amenities, funcionamiento técnico, seguridad edilicia ni exactitud absoluta de fotos.')).toBeInTheDocument();
    expect(screen.getByText('Protocolo claro, evidencia mínima y un sello visible solo cuando la revisión queda aprobada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entender cómo funciona la verificación' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cómo lograr la verificación máxima' })).toBeInTheDocument();
    expect(screen.getByText('Próximamente: guía paso a paso para publicar con verificación presencial y mejorar tu exposición.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No solo publicás mejor. También elegís con más información.' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Publicar mejor no es publicar más. Es publicar con información real.' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acá no publicás más. Publicás mejor.' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Huéspedes' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Qué mirar antes de reservar' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Explorá sabiendo qué ya fue confirmado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Niveles de verificación' })).toBeInTheDocument();
    expect(screen.getByText('No todos los avisos tienen el mismo nivel de respaldo.')).toBeInTheDocument();
    expect(screen.getByText('Sin validación')).toBeInTheDocument();
    expect(screen.getByText('Información cargada por el anfitrión.')).toBeInTheDocument();
    expect(screen.getAllByText('Identidad validada').length).toBeGreaterThan(0);
    expect(screen.getByText('El anfitrión confirmó su identidad.')).toBeInTheDocument();
    expect(screen.getAllByText('Verificado presencialmente').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: 'Verificado presencialmente' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Existencia física, coincidencia general, ubicación real, acceso e identidad básica confirmados durante una visita.')).toBeInTheDocument();
    expect(screen.getByText('*No verificamos calidad del inmueble, limpieza, amenities, funcionamiento técnico, seguridad edilicia ni exactitud absoluta de fotos.*')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Antes de reservar, sabé qué es real.' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Proyecto' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '¿Te pasó de reservar un alquiler y no estar del todo tranquilo?' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
