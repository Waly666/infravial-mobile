import type { AxiosError } from 'axios';

/** Cuerpo típico de error JSON del backend INFRAVIAL. */
export interface ApiErrorBody {
  message?: string;
}

function isAxiosError(err: unknown): err is AxiosError<ApiErrorBody> {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as AxiosError).isAxiosError === true
  );
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }
    if (err.response) {
      return fallback;
    }
    const code = err.code;
    const msg = (err.message || '').toLowerCase();
    if (
      err.message === 'Network Error' ||
      code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED' ||
      msg.includes('network')
    ) {
      return (
        'No llegamos al servidor (error de red). Revisa en Configuración la URL base del backend: ' +
        'desde el celular NO sirve localhost ni 127.0.0.1; usa la IP de tu PC en la WiFi ' +
        '(ej. http://192.168.1.49:3000), que el backend esté encendido y que el firewall de Windows ' +
        'permita conexiones entrantes a ese puerto.'
      );
    }
    if (code === 'ECONNREFUSED') {
      return 'Conexión rechazada: nadie escucha en esa IP/puerto o el firewall lo bloquea.';
    }
    if (code === 'ENOTFOUND') {
      return 'No se encontró el servidor (nombre/IP incorrectos en la URL).';
    }
    if (msg.includes('certificate') || code === 'ERR_BAD_SSL_CLIENT_AUTH_CERT') {
      return 'Problema con el certificado HTTPS. Prueba http en LAN de pruebas o un certificado válido.';
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
