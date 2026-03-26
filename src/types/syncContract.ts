/**
 * Contrato propuesto (no implementado en backend aún) para deduplicación/idempotencia
 * sin romper POST existentes.
 *
 * Opción A — encabezado en ruta actual:
 *   POST /encuesta-vial
 *   Headers: Idempotency-Key: <localId UUID>
 *   Body: mismo que hoy `guardarRespuestas`.
 *   Backend: si ya existe respuesta con esa clave, devolver 200 con el recurso existente.
 *
 * Opción B — ruta dedicada (explícita para móvil):
 *   POST /encuesta-vial/sync
 *   Request body:
 *     { "clientMutationId": "uuid", "payload": { ...mismo shape que guardarRespuestas } }
 *   Response 200:
 *     { "ok": true, "id": "serverObjectId", "deduplicated": false }
 *   Response 200 deduplicado:
 *     { "ok": true, "id": "serverObjectId", "deduplicated": true }
 *   Response 409 (opcional): conflicto de negocio con detalle en `message`.
 */
export interface EncuestaSyncRequest {
  clientMutationId: string;
  payload: Record<string, unknown>;
}

export interface EncuestaSyncResponse {
  ok: boolean;
  id: string;
  deduplicated: boolean;
  message?: string;
}
