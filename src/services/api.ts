const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'advocacia_access_token';

type ErrorBody = {
  error?: {
    code?: string;
    message?: unknown;
  };
};

export type PageMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  meta: PageMeta;
};

export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type SessionClaims = {
  sub: string;
  role: 'ADMIN' | 'USER';
  exp: number;
  can_view_payments?: boolean;
};

export function canViewPayments(claims: SessionClaims | null): boolean {
  return claims?.role === 'ADMIN' || claims?.can_view_payments === true;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function translatePydanticMsg(msg: string, ctx: Record<string, unknown> | undefined): string {
  if (/String should have at most/.test(msg)) {
    const max = ctx?.max_length ?? msg.match(/\d+/)?.[0] ?? '?';
    return `Máximo de ${max} caracteres permitido.`;
  }
  if (/String should have at least/.test(msg)) {
    const min = ctx?.min_length ?? msg.match(/\d+/)?.[0] ?? '?';
    return `Mínimo de ${min} caracteres requerido.`;
  }
  if (msg === 'Field required') return 'Campo obrigatório.';
  if (/valid email/i.test(msg)) return 'E-mail inválido.';
  if (/valid integer/i.test(msg)) return 'Valor inválido.';
  return msg;
}

function parseMessage(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'msg' in message) {
    const m = message as Record<string, unknown>;
    const ctx = m.ctx && typeof m.ctx === 'object' ? (m.ctx as Record<string, unknown>) : undefined;
    return translatePydanticMsg(String(m.msg), ctx);
  }
  return 'Não foi possível concluir a solicitação.';
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getSessionClaims(): SessionClaims | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized)) as SessionClaims;
  } catch {
    clearAccessToken();
    return null;
  }
}

export function hasValidSession(): boolean {
  const claims = getSessionClaims();
  if (!claims) return false;
  if (claims.exp * 1000 <= Date.now()) {
    clearAccessToken();
    return false;
  }
  return true;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { authenticated?: boolean } = {},
): Promise<T> {
  const { authenticated = true, headers, ...requestOptions } = options;
  const token = getAccessToken();
  const requestHeaders = new Headers(headers);

  if (
    requestOptions.body
    && !(requestOptions.body instanceof FormData)
    && !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (authenticated && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearAccessToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    throw new ApiError(
      parseMessage(body.error?.message),
      response.status,
      body.error?.code,
    );
  }

  return body as T;
}

export async function apiDownload(path: string): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    if (response.status === 401) {
      clearAccessToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    throw new ApiError(
      parseMessage(body.error?.message),
      response.status,
      body.error?.code,
    );
  }

  return response.blob();
}
