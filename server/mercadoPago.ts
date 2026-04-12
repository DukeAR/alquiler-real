import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { serverEnv } from './config/env';

type MercadoPagoPreferenceInput = {
  externalReference: string;
  title: string;
  description: string;
  totalChargeArs: number;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl?: string | null;
  payerEmail?: string | null;
  metadata?: Record<string, unknown>;
};

export type MercadoPagoPreferenceResult = {
  preferenceId: string | null;
  checkoutUrl: string;
};

export type MercadoPagoPaymentDetails = {
  id: string;
  status: string | null;
  statusDetail: string | null;
  externalReference: string | null;
  transactionAmount: number | null;
};

type MercadoPagoPreferenceResponse = {
  id?: string | null;
  init_point?: string | null;
  sandbox_init_point?: string | null;
};

type MercadoPagoPaymentResponse = {
  id?: string | number | null;
  status?: string | null;
  status_detail?: string | null;
  external_reference?: string | null;
  transaction_amount?: number | null;
};

let mercadoPagoClient: MercadoPagoConfig | null = null;

const getMercadoPagoClient = () => {
  if (!serverEnv.mercadoPagoAccessToken) {
    throw new Error('Mercado Pago no está configurado.');
  }

  if (!mercadoPagoClient) {
    mercadoPagoClient = new MercadoPagoConfig({ accessToken: serverEnv.mercadoPagoAccessToken });
  }

  return mercadoPagoClient;
};

const normalizePaymentId = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('No recibimos un pago válido desde Mercado Pago.');
  }

  return parsed;
};

export const isMercadoPagoConfigured = () => Boolean(serverEnv.mercadoPagoAccessToken);

export const createMercadoPagoPreference = async ({
  externalReference,
  title,
  description,
  totalChargeArs,
  successUrl,
  failureUrl,
  pendingUrl,
  notificationUrl,
  payerEmail,
  metadata,
}: MercadoPagoPreferenceInput): Promise<MercadoPagoPreferenceResult> => {
  const preferenceClient = new Preference(getMercadoPagoClient());
  const response = await preferenceClient.create({
    body: {
      items: [
        {
          id: externalReference,
          title,
          description,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: totalChargeArs,
        },
      ],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: notificationUrl || undefined,
      payer: payerEmail ? { email: payerEmail } : undefined,
      metadata,
    },
  }) as MercadoPagoPreferenceResponse;

  const checkoutUrl = response.init_point ?? response.sandbox_init_point;

  if (!checkoutUrl) {
    throw new Error('Mercado Pago no devolvió una URL de checkout.');
  }

  return {
    preferenceId: response.id ?? null,
    checkoutUrl,
  };
};

export const getMercadoPagoPaymentDetails = async (paymentId: unknown): Promise<MercadoPagoPaymentDetails> => {
  const normalizedPaymentId = normalizePaymentId(paymentId);
  const paymentClient = new Payment(getMercadoPagoClient());
  const response = await paymentClient.get({ id: normalizedPaymentId }) as MercadoPagoPaymentResponse;

  return {
    id: String(response.id ?? normalizedPaymentId),
    status: typeof response.status === 'string' ? response.status : null,
    statusDetail: typeof response.status_detail === 'string' ? response.status_detail : null,
    externalReference: typeof response.external_reference === 'string' ? response.external_reference : null,
    transactionAmount: typeof response.transaction_amount === 'number' ? response.transaction_amount : null,
  };
};