import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { OnsiteVerificationWorkflow } from '../OnsiteVerificationWorkflow';

const apiJsonMock = vi.fn();
const apiFetchMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('../../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('../../../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

type StatusOverrides = Partial<{
  orderId: string | null;
  status: 'pending_schedule' | 'scheduled' | 'in_progress' | 'approved' | 'requires_review' | 'not_completed';
  statusLabel: string;
  statusDescription: string;
  maintenanceStatus: 'verified' | 'requires_reverification' | 'reverification_pending' | null;
  maintenanceLabel: string | null;
  maintenanceDescription: string | null;
  lastValidatedAt: string | null;
  expiresAt: string | null;
  maintenanceTriggerReason: 'expiration' | 'address_change' | 'relevant_report' | 'detected_inconsistency' | null;
  maintenanceHistory: Array<{
    id: string;
    date: string;
    status: 'verified' | 'requires_reverification' | 'reverification_pending';
    reason: 'expiration' | 'address_change' | 'relevant_report' | 'detected_inconsistency' | null;
    actorLabel: string;
    notes: string | null;
  }>;
  appointmentDate: string | null;
  coordinationNotes: string | null;
  verifierName: string | null;
  checklist: {
    propertyExists: boolean;
    locationMatches: boolean;
    realAccessAvailable: boolean;
    hostLinkedToProperty: boolean;
  };
  evidence: {
    photoCount: number;
    geolocation: string | null;
    timestamp: string | null;
    notes: string | null;
  };
  evidencePhotos: Array<{
    id: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    originalName: string;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    date: string;
    status: 'pending_schedule' | 'scheduled' | 'in_progress' | 'approved' | 'requires_review' | 'not_completed';
    actorLabel: string;
    verifierName: string | null;
    notes: string | null;
  }>;
}>;

const buildStatus = (overrides: StatusOverrides = {}) => ({
  propertyId: 'prop-1',
  propertyTitle: 'Casa frente al mar',
  orderId: 'pvo-onsite-1',
  requestedAt: '2026-05-11T12:00:00.000Z',
  updatedAt: '2026-05-11T12:00:00.000Z',
  status: 'pending_schedule' as const,
  statusLabel: 'Pendiente de agenda',
  statusDescription: 'La solicitud ya quedo abierta. Falta definir el horario.',
  requestSource: 'listing' as const,
  coordinationMode: 'manual' as const,
  appointmentDate: null,
  coordinationNotes: null,
  verifierName: null,
  maintenanceStatus: null,
  maintenanceLabel: null,
  maintenanceDescription: null,
  lastValidatedAt: null,
  expiresAt: null,
  maintenanceTriggerReason: null,
  maintenanceHistory: [],
  checklist: {
    propertyExists: false,
    locationMatches: false,
    realAccessAvailable: false,
    hostLinkedToProperty: false,
  },
  evidence: {
    photoCount: 0,
    geolocation: null,
    timestamp: null,
    notes: null,
  },
  evidencePhotos: [],
  history: [],
  ...overrides,
});

describe('OnsiteVerificationWorkflow', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    apiFetchMock.mockReset();
    showToastMock.mockReset();
  });

  test('moves an onsite request from manual scheduling to internal review with evidence', async () => {
    const statusQueue = [
      buildStatus(),
      buildStatus({
        status: 'scheduled',
        statusLabel: 'Visita programada',
        statusDescription: 'La coordinacion ya quedo registrada.',
        appointmentDate: '2026-05-12T10:30:00.000Z',
        coordinationNotes: 'Porton lateral',
        history: [{
          id: 'hist-1',
          date: '2026-05-11T12:30:00.000Z',
          status: 'scheduled',
          actorLabel: 'Coordinacion manual',
          verifierName: null,
          notes: 'La visita quedo programada.',
        }],
      }),
      buildStatus({
        status: 'in_progress',
        statusLabel: 'Validacion en proceso',
        statusDescription: 'La visita ya empezo.',
        appointmentDate: '2026-05-12T10:30:00.000Z',
        coordinationNotes: 'Porton lateral',
        history: [{
          id: 'hist-2',
          date: '2026-05-12T10:30:00.000Z',
          status: 'in_progress',
          actorLabel: 'Visita presencial',
          verifierName: null,
          notes: 'La visita ya empezo.',
        }],
      }),
      buildStatus({
        status: 'in_progress',
        statusLabel: 'Validacion en proceso',
        statusDescription: 'La visita ya empezo.',
        appointmentDate: '2026-05-12T10:30:00.000Z',
        coordinationNotes: 'Porton lateral',
        evidence: {
          photoCount: 1,
          geolocation: null,
          timestamp: null,
          notes: null,
        },
        evidencePhotos: [{
          id: 'vf-onsite-1',
          fileUrl: 'https://example.com/onsite-photo-1.jpg',
          thumbnailUrl: null,
          originalName: 'frente.jpg',
          createdAt: '2026-05-12T11:00:00.000Z',
        }],
      }),
      buildStatus({
        status: 'requires_review',
        statusLabel: 'Requiere revision',
        statusDescription: 'La visita dejo respaldo suficiente para revision interna.',
        appointmentDate: '2026-05-12T10:30:00.000Z',
        coordinationNotes: 'Porton lateral',
        verifierName: 'Lucia R.',
        checklist: {
          propertyExists: true,
          locationMatches: true,
          realAccessAvailable: true,
          hostLinkedToProperty: true,
        },
        evidence: {
          photoCount: 1,
          geolocation: '-37.1200, -56.8600',
          timestamp: '2026-05-12T11:15:00.000Z',
          notes: 'Se registro acceso y fachada sin desvio visible.',
        },
        evidencePhotos: [{
          id: 'vf-onsite-1',
          fileUrl: 'https://example.com/onsite-photo-1.jpg',
          thumbnailUrl: null,
          originalName: 'frente.jpg',
          createdAt: '2026-05-12T11:00:00.000Z',
        }],
        history: [{
          id: 'hist-3',
          date: '2026-05-12T11:15:00.000Z',
          status: 'requires_review',
          actorLabel: 'Registro de visita',
          verifierName: 'Lucia R.',
          notes: 'Se registro acceso y fachada sin desvio visible.',
        }],
      }),
    ];

    apiJsonMock.mockImplementation(async (url: string, options?: { method?: string; body?: string }) => {
      if (url.startsWith('/api/verification/onsite/status?')) {
        const nextStatus = statusQueue.shift();
        if (!nextStatus) {
          throw new Error('No status queued');
        }
        return nextStatus;
      }

      if (url === '/api/verification/onsite/complete') {
        expect(options?.method).toBe('POST');
        expect(JSON.parse(String(options?.body))).toMatchObject({
          propertyId: 'prop-1',
          orderId: 'pvo-onsite-1',
          coordinationNotes: 'Porton lateral',
        });
        return { success: true };
      }

      if (url === '/api/verification/onsite/start') {
        expect(options?.method).toBe('POST');
        return { success: true };
      }

      if (url === '/api/verification/onsite/report') {
        expect(options?.method).toBe('POST');
        expect(JSON.parse(String(options?.body))).toMatchObject({
          propertyId: 'prop-1',
          orderId: 'pvo-onsite-1',
          verifierName: 'Lucia R.',
          geolocation: '-37.1200, -56.8600',
          result: 'requires_review',
          evidencePhotoIds: ['vf-onsite-1'],
          checklist: {
            propertyExists: true,
            locationMatches: true,
            realAccessAvailable: true,
            hostLinkedToProperty: true,
          },
        });
        return { success: true };
      }

      throw new Error(`Unexpected apiJson call: ${url}`);
    });

    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <OnsiteVerificationWorkflow
        onComplete={vi.fn()}
        propertyId="prop-1"
        orderId="pvo-onsite-1"
        propertyTitle="Casa frente al mar"
      />,
    );

    expect(await screen.findByText('Pendiente de agenda')).toBeInTheDocument();

    const appointmentButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('Agenda operativa sugerida'));

    expect(appointmentButton).toBeTruthy();
    fireEvent.click(appointmentButton as HTMLButtonElement);
    fireEvent.change(screen.getByLabelText('Nota de coordinacion'), {
      target: { value: 'Porton lateral' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar visita programada' }));

    expect((await screen.findAllByText('Visita programada')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar validacion en proceso' }));

    expect((await screen.findAllByText('Validacion en proceso')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('La propiedad existe'));
    fireEvent.click(screen.getByLabelText('La ubicacion coincide'));
    fireEvent.click(screen.getByLabelText('Hay acceso real disponible'));
    fireEvent.click(screen.getByLabelText('El anfitrion esta vinculado a la propiedad'));
    fireEvent.change(screen.getByLabelText('Verificador'), {
      target: { value: 'Lucia R.' },
    });
    fireEvent.change(screen.getByLabelText('Geolocalizacion'), {
      target: { value: '-37.1200, -56.8600' },
    });
    fireEvent.change(screen.getByLabelText('Observaciones breves'), {
      target: { value: 'Se registro acceso y fachada sin desvio visible.' },
    });

    fireEvent.change(screen.getByLabelText('Fotos minimas'), {
      target: {
        files: [new File(['front'], 'frente.jpg', { type: 'image/jpeg' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar evidencia' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('frente.jpg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revision interna' }));

    expect((await screen.findAllByText('Requiere revision')).length).toBeGreaterThan(0);
    expect(screen.getByText('El registro ya paso a revision interna. Hasta cerrar ese analisis, la publicacion sigue sin sello presencial activo.')).toBeInTheDocument();
  });

  test('shows the maintenance panel when a previous onsite verification needs an update', async () => {
    apiJsonMock.mockResolvedValue(buildStatus({
      status: 'approved',
      statusLabel: 'Aprobada',
      statusDescription: 'La visita anterior fue aprobada.',
      maintenanceStatus: 'requires_reverification',
      maintenanceLabel: 'Requiere reverificación',
      maintenanceDescription: 'La verificación presencial necesita actualizarse.',
      lastValidatedAt: '2026-04-10T15:00:00.000Z',
      expiresAt: '2026-10-10T15:00:00.000Z',
      maintenanceTriggerReason: 'relevant_report',
      maintenanceHistory: [{
        id: 'mh-1',
        date: '2026-10-11T10:00:00.000Z',
        status: 'requires_reverification',
        reason: 'relevant_report',
        actorLabel: 'Revisión interna',
        notes: 'Entraron reportes relevantes y conviene revisar otra vez la validación presencial.',
      }],
    }));

    render(
      <OnsiteVerificationWorkflow
        onComplete={vi.fn()}
        propertyId="prop-1"
        orderId="pvo-onsite-1"
        propertyTitle="Casa frente al mar"
      />,
    );

    expect(await screen.findByText('Vigencia de la verificación')).toBeInTheDocument();
    expect(screen.getAllByText('La verificación presencial necesita actualizarse.').length).toBeGreaterThan(0);
    expect(screen.getByText('Motivo operativo')).toBeInTheDocument();
    expect(screen.getByText('Reportes relevantes')).toBeInTheDocument();
    expect(screen.getByText('Historial de mantenimiento')).toBeInTheDocument();
  });
});