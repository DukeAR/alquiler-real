import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const apiJsonMock = vi.fn();
const showToastMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

import InternalSupportQueue from '../InternalSupportQueue';

describe('InternalSupportQueue', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    showToastMock.mockReset();
    useAuthMock.mockReset();
    window.localStorage.clear();
    useAuthMock.mockReturnValue({ user: { id: 'ops_self', name: 'Operaciones', email: 'ops@alquilerreal.com', canInternalOps: true } });
  });

  test('validates the internal secret, loads queue items, and updates a case status', async () => {
    apiJsonMock.mockImplementation(async (url: string) => {
      if (url === '/api/internal/support/review-queue?status=open') {
        return {
          items: [
            {
              id: 'support_1',
              entryPoint: 'checkin',
              entryPointLabel: 'Check-in',
              category: 'no_access',
              categoryLabel: 'No pude ingresar',
              description: 'Llegue y no pude entrar.',
              status: 'received',
              statusLabel: 'Recibido',
              statusNote: null,
              lastStatusBy: null,
              propertyId: 'prop_1',
              bookingId: 'booking_1',
              conversationId: 'conv_1',
              reviewType: null,
              createdAt: '2026-05-10T15:00:00.000Z',
              updatedAt: '2026-05-10T15:00:00.000Z',
              lastStatusAt: '2026-05-10T15:00:00.000Z',
              user: {
                id: 'guest_1',
                name: 'Valeria',
                role: 'tenant',
              },
              property: {
                id: 'prop_1',
                title: 'Casa frente al mar',
              },
              operation: {
                bookingId: 'booking_1',
                conversationId: 'conv_1',
                reviewType: null,
                operationId: 'booking_1',
                operationType: 'booking',
                viewerRole: 'guest',
                requestMode: 'protected',
                requestStatus: null,
                depositStatus: 'held',
                operationStatus: null,
              },
              timestamps: {
                checkInDate: '2026-05-20T00:00:00.000Z',
              },
              contextSnapshot: {
                propertyTitle: 'Casa frente al mar',
              },
            },
          ],
        };
      }

      if (url === '/api/internal/operators') {
        return {
          items: [
            {
              id: 'ops_self',
              email: 'ops@alquilerreal.com',
              name: 'Operaciones',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-05-01T10:00:00.000Z',
            },
          ],
        };
      }

      if (url === '/api/internal/property-verification/review-queue') {
        return { items: [] };
      }

      if (url === '/api/internal/moderation/review-queue') {
        return { items: [] };
      }

      if (url === '/api/internal/support/cases/support_1/review') {
        return {
          success: true,
          case: {
            id: 'support_1',
            entryPoint: 'checkin',
            entryPointLabel: 'Check-in',
            category: 'no_access',
            categoryLabel: 'No pude ingresar',
            description: 'Llegue y no pude entrar.',
            status: 'in_review',
            statusLabel: 'En revision',
            statusNote: 'Estamos revisando el ingreso con el anfitrion.',
            lastStatusBy: 'ops@alquilerreal.com',
            propertyId: 'prop_1',
            bookingId: 'booking_1',
            conversationId: 'conv_1',
            reviewType: null,
            createdAt: '2026-05-10T15:00:00.000Z',
            updatedAt: '2026-05-10T15:30:00.000Z',
            lastStatusAt: '2026-05-10T15:30:00.000Z',
            user: {
              id: 'guest_1',
              name: 'Valeria',
              role: 'tenant',
            },
            property: {
              id: 'prop_1',
              title: 'Casa frente al mar',
            },
            operation: {
              bookingId: 'booking_1',
              conversationId: 'conv_1',
              reviewType: null,
              operationId: 'booking_1',
              operationType: 'booking',
              viewerRole: 'guest',
              requestMode: 'protected',
              requestStatus: null,
              depositStatus: 'held',
              operationStatus: null,
            },
            timestamps: {
              checkInDate: '2026-05-20T00:00:00.000Z',
            },
            contextSnapshot: {
              propertyTitle: 'Casa frente al mar',
            },
          },
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<InternalSupportQueue />);

    fireEvent.change(screen.getByLabelText(/Secreto interno/i), {
      target: { value: 'ops-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar a soporte/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/support/review-queue?status=open', {
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
      });
    });

    expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/operators', {
      headers: {
        'x-internal-ops-secret': 'ops-secret',
      },
    });

    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(window.localStorage.getItem('ar_internal_ops_secret')).toBe('ops-secret');

    fireEvent.change(screen.getByLabelText(/Nota operativa/i), {
      target: { value: 'Estamos revisando el ingreso con el anfitrion.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Pasar a revisión/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/support/cases/support_1/review', {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
        body: JSON.stringify({
          status: 'in_review',
          statusNote: 'Estamos revisando el ingreso con el anfitrion.',
          reviewedBy: 'ops@alquilerreal.com',
        }),
      });
    });

    expect(screen.getAllByText('En revision')).toHaveLength(2);
    expect(showToastMock).toHaveBeenCalledWith('Soporte interno', expect.stringMatching(/Acceso interno habilitado/i), 'success');
    expect(showToastMock).toHaveBeenCalledWith('Soporte interno', expect.stringMatching(/Caso actualizado/i), 'success');
  });

  test('assigns and revokes internal operators from the same panel', async () => {
    apiJsonMock.mockImplementation(async (url: string, options?: { body?: string }) => {
      if (url === '/api/internal/support/review-queue?status=open') {
        return { items: [] };
      }

      if (url === '/api/internal/operators') {
        return {
          items: [
            {
              id: 'ops_self',
              email: 'ops@alquilerreal.com',
              name: 'Operaciones',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-05-01T10:00:00.000Z',
            },
          ],
        };
      }

      if (url === '/api/internal/property-verification/review-queue') {
        return { items: [] };
      }

      if (url === '/api/internal/moderation/review-queue') {
        return { items: [] };
      }

      if (url === '/api/internal/operators/access' && options?.body === JSON.stringify({ email: 'valeria@demo.com', enabled: true })) {
        return {
          success: true,
          user: {
            id: 'demo_host_valeria',
            email: 'valeria@demo.com',
            name: 'Valeria Soria',
            role: 'host',
            isInternalOperator: true,
            createdAt: '2026-05-02T10:00:00.000Z',
          },
        };
      }

      if (url === '/api/internal/operators/access' && options?.body === JSON.stringify({ email: 'valeria@demo.com', enabled: false })) {
        return {
          success: true,
          user: {
            id: 'demo_host_valeria',
            email: 'valeria@demo.com',
            name: 'Valeria Soria',
            role: 'host',
            isInternalOperator: false,
            createdAt: '2026-05-02T10:00:00.000Z',
          },
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<InternalSupportQueue />);

    fireEvent.change(screen.getByLabelText(/Secreto interno/i), {
      target: { value: 'ops-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar a soporte/i }));

    await waitFor(() => {
      expect(screen.getByText('Gestionar operadores')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Email del operador/i), {
      target: { value: 'valeria@demo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Dar acceso interno/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/operators/access', {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
        body: JSON.stringify({
          email: 'valeria@demo.com',
          enabled: true,
        }),
      });
    });

    expect(screen.getByText('Valeria Soria')).toBeInTheDocument();

    const revokeButton = screen.getAllByRole('button', { name: /Revocar acceso/i }).find((button) => !button.hasAttribute('disabled'));

    expect(revokeButton).toBeDefined();

    fireEvent.click(revokeButton!);

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/operators/access', {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
        body: JSON.stringify({
          email: 'valeria@demo.com',
          enabled: false,
        }),
      });
    });

    expect(screen.queryByText('Valeria Soria')).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith('Soporte interno', expect.stringMatching(/ahora tiene acceso interno/i), 'success');
    expect(showToastMock).toHaveBeenCalledWith('Soporte interno', expect.stringMatching(/ya no tiene acceso interno/i), 'success');
  });

  test('renders property verification items and marks reverification pending from the same panel', async () => {
    apiJsonMock.mockImplementation(async (url: string, options?: { body?: string; method?: string }) => {
      if (url === '/api/internal/support/review-queue?status=open') {
        return { items: [] };
      }

      if (url === '/api/internal/operators') {
        return {
          items: [
            {
              id: 'ops_self',
              email: 'ops@alquilerreal.com',
              name: 'Operaciones',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-05-01T10:00:00.000Z',
            },
          ],
        };
      }

      if (url === '/api/internal/property-verification/review-queue') {
        if (options?.method === 'POST') {
          throw new Error('Unexpected POST to queue endpoint');
        }

        return {
          items: [
            {
              propertyId: 'prop-1',
              propertyTitle: 'Casa frente al mar',
              hostId: 'host-1',
              hostName: 'Ana',
              pendingDocumentsCount: 0,
              documents: [],
              onsiteOrderId: null,
              onsiteOperationalStatus: null,
              onsiteOperationalLabel: null,
              onsiteOperationalDescription: null,
              onsiteAppointmentDate: null,
              onsiteVerifierName: null,
              onsiteMaintenanceStatus: 'requires_reverification',
              onsiteMaintenanceLabel: 'Requiere reverificación',
              onsiteMaintenanceDescription: 'La verificación presencial necesita actualizarse.',
              onsiteLastValidatedAt: '2026-04-10T15:00:00.000Z',
              onsiteExpiresAt: '2026-10-10T15:00:00.000Z',
              onsiteTriggerReason: 'expiration',
              onsiteNeedsRefresh: true,
              onsiteCurrentlyValid: false,
            },
          ],
        };
      }

      if (url === '/api/internal/moderation/review-queue') {
        return { items: [] };
      }

      if (url === '/api/internal/properties/prop-1/verification/review') {
        expect(options?.method).toBe('POST');
        expect(options?.body).toBe(JSON.stringify({
          action: 'mark-reverification-pending',
          notes: 'La numeración cambió y conviene actualizar la visita.',
          triggerReason: 'address_change',
        }));

        return {
          success: true,
          propertyId: 'prop-1',
          action: 'mark-reverification-pending',
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<InternalSupportQueue />);

    fireEvent.change(screen.getByLabelText(/Secreto interno/i), {
      target: { value: 'ops-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar a soporte/i }));

    expect(await screen.findByText('Revisión documental y presencial')).toBeInTheDocument();
    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getAllByText('La verificación presencial necesita actualizarse.').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Motivo operativo prop-1'), {
      target: { value: 'address_change' },
    });
    fireEvent.change(screen.getByLabelText(/Nota operativa/i), {
      target: { value: 'La numeración cambió y conviene actualizar la visita.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Formalizar reverificación pendiente/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/properties/prop-1/verification/review', {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
        body: JSON.stringify({
          action: 'mark-reverification-pending',
          notes: 'La numeración cambió y conviene actualizar la visita.',
          triggerReason: 'address_change',
        }),
      });
    });

    expect(showToastMock).toHaveBeenCalledWith('Soporte interno', 'Reverificación pendiente registrada', 'success');
  });

  test('opens the linked property review from a support case without manual property search', async () => {
    apiJsonMock.mockImplementation(async (url: string) => {
      if (url === '/api/internal/support/review-queue?status=open') {
        return {
          items: [
            {
              id: 'support_1',
              entryPoint: 'chat',
              entryPointLabel: 'Chat',
              category: 'listing_question',
              categoryLabel: 'Consulta sobre el aviso',
              description: 'El huésped pide validar de nuevo la propiedad.',
              status: 'received',
              statusLabel: 'Recibido',
              statusNote: null,
              lastStatusBy: null,
              propertyId: 'prop_1',
              bookingId: null,
              conversationId: 'conv_1',
              reviewType: null,
              createdAt: '2026-05-10T15:00:00.000Z',
              updatedAt: '2026-05-10T15:00:00.000Z',
              lastStatusAt: '2026-05-10T15:00:00.000Z',
              user: { id: 'guest_1', name: 'Valeria', role: 'tenant' },
              property: { id: 'prop_1', title: 'Casa frente al mar' },
              operation: {
                bookingId: null,
                conversationId: 'conv_1',
                reviewType: null,
                operationId: 'conv_1',
                operationType: 'conversation',
                viewerRole: 'guest',
                requestMode: null,
                requestStatus: null,
                depositStatus: null,
                operationStatus: null,
              },
              timestamps: {},
              contextSnapshot: { propertyTitle: 'Casa frente al mar' },
            },
          ],
        };
      }

      if (url === '/api/internal/operators') {
        return {
          items: [
            {
              id: 'ops_self',
              email: 'ops@alquilerreal.com',
              name: 'Operaciones',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-05-01T10:00:00.000Z',
            },
          ],
        };
      }

      if (url === '/api/internal/property-verification/review-queue') {
        return { items: [] };
      }

      if (url === '/api/internal/property-verification/review-queue?propertyId=prop_1') {
        return {
          items: [
            {
              propertyId: 'prop_1',
              propertyTitle: 'Casa frente al mar',
              hostId: 'host-1',
              hostName: 'Ana',
              pendingDocumentsCount: 0,
              documents: [],
              onsiteOrderId: null,
              onsiteOperationalStatus: null,
              onsiteOperationalLabel: null,
              onsiteOperationalDescription: null,
              onsiteAppointmentDate: null,
              onsiteVerifierName: null,
              onsiteMaintenanceStatus: 'verified',
              onsiteMaintenanceLabel: 'Verificada',
              onsiteMaintenanceDescription: 'La verificación presencial sigue vigente dentro de la ventana recomendada de 6 meses.',
              onsiteLastValidatedAt: '2026-04-10T15:00:00.000Z',
              onsiteExpiresAt: '2026-10-10T15:00:00.000Z',
              onsiteTriggerReason: null,
              onsiteNeedsRefresh: false,
              onsiteCurrentlyValid: true,
            },
          ],
        };
      }

      if (url === '/api/internal/moderation/review-queue') {
        return { items: [] };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<InternalSupportQueue />);

    fireEvent.change(screen.getByLabelText(/Secreto interno/i), {
      target: { value: 'ops-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar a soporte/i }));

    expect(await screen.findByText('Revisión documental y presencial')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cargar revisión de propiedad/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/property-verification/review-queue?propertyId=prop_1', {
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
      });
    });

    expect(await screen.findByRole('button', { name: /Marcar reverificación pendiente/i })).toBeInTheDocument();
  });

  test('marks reverification from a property-linked report and reloads the property review queue', async () => {
    apiJsonMock.mockImplementation(async (url: string, options?: { body?: string; method?: string }) => {
      if (url === '/api/internal/support/review-queue?status=open') {
        return { items: [] };
      }

      if (url === '/api/internal/operators') {
        return {
          items: [
            {
              id: 'ops_self',
              email: 'ops@alquilerreal.com',
              name: 'Operaciones',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-05-01T10:00:00.000Z',
            },
          ],
        };
      }

      if (url === '/api/internal/property-verification/review-queue') {
        return {
          items: [
            {
              propertyId: 'prop-1',
              propertyTitle: 'Casa frente al bosque',
              hostId: 'host-1',
              hostName: 'Mariana',
              pendingDocumentsCount: 0,
              documents: [],
              onsiteOrderId: null,
              onsiteOperationalStatus: null,
              onsiteOperationalLabel: null,
              onsiteOperationalDescription: null,
              onsiteAppointmentDate: null,
              onsiteVerifierName: null,
              onsiteMaintenanceStatus: 'reverification_pending',
              onsiteMaintenanceLabel: 'Reverificación pendiente',
              onsiteMaintenanceDescription: 'La verificación presencial necesita actualizarse. Ya quedó marcada para una nueva revisión.',
              onsiteLastValidatedAt: '2026-04-10T15:00:00.000Z',
              onsiteExpiresAt: '2026-10-10T15:00:00.000Z',
              onsiteTriggerReason: 'relevant_report',
              onsiteNeedsRefresh: true,
              onsiteCurrentlyValid: false,
            },
          ],
        };
      }

      if (url === '/api/internal/property-verification/review-queue?propertyId=prop-1') {
        return {
          items: [
            {
              propertyId: 'prop-1',
              propertyTitle: 'Casa frente al bosque',
              hostId: 'host-1',
              hostName: 'Mariana',
              pendingDocumentsCount: 0,
              documents: [],
              onsiteOrderId: null,
              onsiteOperationalStatus: null,
              onsiteOperationalLabel: null,
              onsiteOperationalDescription: null,
              onsiteAppointmentDate: null,
              onsiteVerifierName: null,
              onsiteMaintenanceStatus: 'verified',
              onsiteMaintenanceLabel: 'Verificada',
              onsiteMaintenanceDescription: 'La verificación presencial sigue vigente dentro de la ventana recomendada de 6 meses.',
              onsiteLastValidatedAt: '2026-04-10T15:00:00.000Z',
              onsiteExpiresAt: '2026-10-10T15:00:00.000Z',
              onsiteTriggerReason: null,
              onsiteNeedsRefresh: false,
              onsiteCurrentlyValid: true,
            },
          ],
        };
      }

      if (url === '/api/internal/moderation/review-queue') {
        return {
          items: [
            {
              id: 'rep-1',
              createdAt: '2026-05-01T10:00:00.000Z',
              status: 'pending',
              severity: 'standard',
              reason: 'not_as_listed',
              reasonLabel: 'No coincidencia con lo publicado',
              description: 'Las fotos ya no coinciden.',
              reporterWeight: 1.2,
              user: { id: 'host-1', name: 'Mariana' },
              property: { id: 'prop-1', title: 'Casa frente al bosque' },
              history: {
                recentReportsCount: 3,
                confirmedReportsCount: 1,
                recentModerationEvents: [],
              },
              risk: {
                level: 'medium',
                flags: [],
                manualReviewRequired: false,
                visibilityPenalty: 18,
              },
              strikes: 1,
              appliedStrikeDelta: 0,
              reviewNotes: null,
              reviewedBy: null,
            },
          ],
        };
      }

      if (url === '/api/internal/properties/prop-1/verification/review') {
        expect(options?.method).toBe('POST');
        expect(options?.body).toBe(JSON.stringify({
          action: 'mark-reverification-pending',
          notes: 'Las fotos ya no coinciden.',
          triggerReason: 'relevant_report',
        }));

        return {
          success: true,
          propertyId: 'prop-1',
          action: 'mark-reverification-pending',
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<InternalSupportQueue />);

    fireEvent.change(screen.getByLabelText(/Secreto interno/i), {
      target: { value: 'ops-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar a soporte/i }));

    expect(await screen.findByText('Moderación conectada con revisión de propiedades')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Marcar reverificación por reporte/i }));

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/internal/properties/prop-1/verification/review', {
        method: 'POST',
        headers: {
          'x-internal-ops-secret': 'ops-secret',
        },
        body: JSON.stringify({
          action: 'mark-reverification-pending',
          notes: 'Las fotos ya no coinciden.',
          triggerReason: 'relevant_report',
        }),
      });
    });

    expect(showToastMock).toHaveBeenCalledWith('Soporte interno', 'La propiedad quedó marcada para reverificación por reporte relevante.', 'success');
  });
});