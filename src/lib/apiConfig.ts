/**
 * CONFIGURACIÓN CENTRALIZADA DE API
 *
 * Todas las llamadas al backend DEBEN usar esta configuración.
 * Mantén el control del base URL en UN SOLO lugar.
 */

import {
  getRequestCacheMode,
  getRequestTtlMs,
  getDataProviderStats,
  invalidateRelatedData,
  loadResponse,
  maybeGetMockApiResponse,
} from './dataProvider';

// Base URL del backend
// En desarrollo: usa rutas relativas /api para que el proxy de Vite maneje localhost,
// ngrok, localtunnel o cualquier host remoto sin intentar llamar a localhost desde el navegador.
// En producción: configura VITE_BACKEND_URL en .env.production.
const normalizeBackendUrl = (value: string) => value.replace(/\/+$/, '');
const runtimeEnv = (typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : {}) as Record<string, string | boolean | undefined>;

const getBackendUrl = (): string => {
  const configuredUrl = typeof runtimeEnv.VITE_BACKEND_URL === 'string'
    ? runtimeEnv.VITE_BACKEND_URL.trim()
    : '';

  if (runtimeEnv.DEV) {
    if (!configuredUrl) {
      return '';
    }

    try {
      const parsedUrl = new URL(configuredUrl);
      const isLoopback = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname);
      if (isLoopback) {
        return '';
      }
    } catch {
      return '';
    }
  }

  return configuredUrl ? normalizeBackendUrl(configuredUrl) : '';
};

export const API_BASE_URL = getBackendUrl();
const API_TIMEOUT_MS = Number(runtimeEnv.VITE_API_TIMEOUT || 30000);

export type ApiRequestOptions = Omit<RequestInit, 'credentials'> & {
  includeCredentials?: true;
  ttlMs?: number;
  noCache?: boolean;
  revalidateSeconds?: number;
};

// Logger para debugging
const logApiCall = (method: string, url: string, details?: any) => {
  if (runtimeEnv.DEV) {
    console.log(`[API] ${method} ${url}`, details || '');
  }
};

const getHttpErrorMessage = (response: Response): string => {
  switch (response.status) {
    case 400:
      return 'No pudimos procesar la solicitud.';
    case 401:
      return 'Necesitás iniciar sesión para seguir.';
    case 403:
      return 'No podés hacer eso.';
    case 404:
      return 'No encontramos lo que buscás.';
    case 408:
      return 'Esto tardó demasiado. Intentá de nuevo.';
    case 429:
      return 'Hay mucho movimiento ahora. Probá de nuevo en un rato.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Tuvimos un problema en el servidor. Intentá de nuevo.';
    default:
      return 'No pudimos completar la solicitud.';
  }
};

/**
 * Interpreta errores de fetch específicos
 */
const interpretFetchError = (error: any, url: string, method: string): string => {
  const message = error?.message || String(error);
  
  // Errores de red y CORS
  if (message.includes('Failed to fetch')) {
    // Intenta detectar el tipo de error
    if (url.includes('localhost') && window.location.protocol === 'https:') {
      return 'No pudimos conectar con la app local. Revisá la URL de desarrollo o el túnel que estés usando.';
    }
    
    if (method === 'OPTIONS' || message.includes('CORS')) {
      return 'No pudimos conectarnos desde acá. Revisá la configuración de acceso del servidor.';
    }
    
    return 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.';
  }
  
  if (error?.name === 'AbortError' || message.includes('TimeoutError')) {
    return 'El servidor tardó demasiado en responder. Intentá de nuevo.';
  }
  
  if (message.includes('NetworkError')) {
    return 'Se cortó la conexión con el servidor. Intentá de nuevo.';
  }
  
  return 'No pudimos completar la conexión con el servidor. Intentá de nuevo.';
};

/**
 * Función helper para hacer fetch seguro con manejo de errores
 */
export async function apiFetch(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    includeCredentials: _includeCredentials,
    ttlMs,
    noCache = false,
    revalidateSeconds,
    ...fetchOptions
  } = options;

  // Construir URL absoluta
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const resolvedCacheMode = getRequestCacheMode(endpoint, method, fetchOptions.cache, noCache);
  const resolvedTtlMs = getRequestTtlMs(endpoint, ttlMs, revalidateSeconds);

  // Configurar opciones finales
  const finalOptions: RequestInit = {
    ...fetchOptions,
    credentials: 'include',
    ...(resolvedCacheMode ? { cache: resolvedCacheMode } : {}),
  };

  // Asegurar que headers sea un objeto
  if (!finalOptions.headers) {
    finalOptions.headers = {};
  }

  // Agregar Content-Type si no existe
  if (typeof finalOptions.headers === 'object' && !Array.isArray(finalOptions.headers)) {
    const headers = finalOptions.headers as Record<string, string>;
    const isFormDataBody = typeof FormData !== 'undefined' && finalOptions.body instanceof FormData;
    if (!headers['Content-Type'] && finalOptions.method !== 'GET' && !isFormDataBody) {
      headers['Content-Type'] = 'application/json';
    }
  }

  logApiCall(method, url, { 
    credentials: finalOptions.credentials,
    hasBody: !!fetchOptions.body,
    cache: finalOptions.cache,
    ttlMs: resolvedTtlMs,
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  try {
    const response = await loadResponse(endpoint, {
      method,
      ttlMs: resolvedTtlMs,
      noCache,
    }, async () => {
      const mockResponse = await maybeGetMockApiResponse(endpoint, {
        ...finalOptions,
        method,
      });

      if (mockResponse) {
        return mockResponse;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        return await fetch(url, {
          ...finalOptions,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    });

    const contentType = response.headers?.get?.('Content-Type') || null;
    const corsHeader = response.headers?.get?.('Access-Control-Allow-Origin') || null;
    
    logApiCall(`${method} RESPONSE`, `${response.status} ${response.statusText}`, { 
      url,
      contentType,
      corsHeader,
    });
    
    if (!response.ok) {
      console.error(`[API ERROR] ${response.status} ${response.statusText}`, {
        url,
        method,
        statusText: response.statusText,
        corsHeader,
        origin: window.location.origin,
      });
    } else if (method !== 'GET') {
      invalidateRelatedData(endpoint, { body: fetchOptions.body });
    }
    
    return response;
  } catch (error: any) {
    const errorMsg = interpretFetchError(error, url, method);
    console.error(`[API NETWORK ERROR]`, {
      endpoint,
      url,
      method,
      error: errorMsg,
      originalError: error?.message,
    });
    throw new Error(errorMsg);
  }
}

export const getApiUsageStats = getDataProviderStats;

/**
 * Función helper para peticiones JSON con type-safety
 */
export async function apiJson<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  try {
    const response = await apiFetch(endpoint, options);
    
    if (!response.ok) {
      // Intentar parsear error del backend
      let errorMessage = getHttpErrorMessage(response);
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Si no hay JSON, usar el status text
      }
      
      console.error(`[apiJson] Error Response:`, {
        status: response.status,
        message: errorMessage,
        endpoint
      });
      
      throw new Error(errorMessage);
    }
    
    // Parsear respuesta exitosa
    try {
      const data = await response.json();
      return data as T;
    } catch (parseErr) {
      console.error(`[apiJson] Failed to parse JSON:`, parseErr);
      throw new Error('Nos llegó una respuesta rara del servidor. Probá de nuevo.');
    }
  } catch (error) {
    // Re-throw para que el caller pueda manejar
    throw error instanceof Error ? error : new Error(String(error));
  }
}
