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

export type PermissionKey =
  | 'landing_page'
  | 'artigos'
  | 'leads'
  | 'clientes'
  | 'agenda'
  | 'pagamentos'
  | 'processos'
  | 'tarefas'
  | 'notificacoes'
  | 'logs_api'
  | 'feriados'
  | 'financeiro';

export type SessionClaims = {
  sub: string;
  role: 'ADMIN' | 'USER';
  exp: number;
  permissions?: string[];
};

export function hasPermission(claims: SessionClaims | null, key: PermissionKey): boolean {
  if (!claims) return false;
  return claims.role === 'ADMIN' || (claims.permissions ?? []).includes(key);
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
  const clean = msg.replace(/^Value error,\s*/i, '');
  if (/String should have at most/.test(clean)) {
    const max = ctx?.max_length ?? clean.match(/\d+/)?.[0] ?? '?';
    return `Máximo de ${max} caracteres permitido.`;
  }
  if (/String should have at least/.test(clean)) {
    const min = ctx?.min_length ?? clean.match(/\d+/)?.[0] ?? '?';
    return `Mínimo de ${min} caracteres requerido.`;
  }
  if (clean === 'Field required') return 'Campo obrigatório.';
  if (/valid email/i.test(clean)) return 'E-mail inválido.';
  if (/valid integer/i.test(clean)) return 'Valor inválido.';
  if (/^URL |valid URL|relative URL|url_parsing|URL scheme/i.test(clean)) {
    return 'URL inválida. Insira um link completo iniciando com https:// ou http://';
  }
  return clean;
}

function parseMessage(message: unknown): string {
  if (typeof message === 'string') return translatePydanticMsg(message, undefined);
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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
    });
  } catch (networkErr) {
    if (
      networkErr instanceof TypeError ||
      (networkErr instanceof Error && /networkerror|failed to fetch/i.test(networkErr.message))
    ) {
      throw new ApiError(
        'Falha na conexão com o servidor. Verifique sua conexão com a internet e tente novamente.',
        0,
        'NETWORK_ERROR',
      );
    }
    throw networkErr;
  }

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
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (networkErr) {
    if (
      networkErr instanceof TypeError ||
      (networkErr instanceof Error && /networkerror|failed to fetch/i.test(networkErr.message))
    ) {
      throw new ApiError(
        'Falha na conexão com o servidor. Verifique sua conexão com a internet e tente novamente.',
        0,
        'NETWORK_ERROR',
      );
    }
    throw networkErr;
  }

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
