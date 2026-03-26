type SessionInvalidHandler = () => void;

let onSessionInvalid: SessionInvalidHandler | null = null;

/** Registrado desde `AuthProvider` para alinear estado en memoria tras fallo de refresh. */
export function setSessionInvalidHandler(handler: SessionInvalidHandler | null): void {
  onSessionInvalid = handler;
}

export function emitSessionInvalid(): void {
  onSessionInvalid?.();
}
