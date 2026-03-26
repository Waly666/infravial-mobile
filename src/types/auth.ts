export type UserRole = 'admin' | 'supervisor' | 'encuestador' | string;

/** Payload embebido en JWT y devuelto en login (`usuario`). */
export interface SessionUser {
  id: string;
  user: string;
  nombres: string;
  apellidos: string;
  rol: UserRole;
}

export interface LoginRequest {
  user: string;
  password: string;
}

export interface LoginResponseBody {
  message: string;
  accessToken: string;
  refreshToken: string;
  usuario: SessionUser;
}

export interface RefreshResponseBody {
  message: string;
  accessToken: string;
}
