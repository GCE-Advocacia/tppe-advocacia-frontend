import { apiRequest, PaginatedResponse, SuccessResponse } from './api';

export type UserRole = 'ADMIN' | 'USER';

export type UserStatus = 'INVITED' | 'ACTIVE';
export type InviteStatus = 'PENDING' | 'EXPIRED' | 'USED' | 'CANCELLED';

export interface InviteSummary {
  status: InviteStatus;
  sent_at: string;
  expires_at: string;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  can_view_payments: boolean;
  created_at: string;
  updated_at: string;
  /** Último convite enviado; null se o usuário nunca foi convidado. */
  invite: InviteSummary | null;
}

export interface AuditLog {
  id: number;
  action:
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DEACTIVATED'
    | 'CLIENT_ANONYMIZED'
    | 'EMAIL_SETTINGS_UPDATED';
  performed_by_id: number;
  performed_by_name: string;
  target_user_id: number | null;
  target_user_name: string | null;
  target_user_email: string | null;
  target_user_role: UserRole | null;
  target_client_id: number | null;
  target_client_name: string | null;
  details: { profile?: string; changes?: Record<string, unknown> } | null;
  created_at: string;
}

export async function listActiveUsers(): Promise<PaginatedResponse<ApiUser>> {
  return apiRequest('/users?is_active=true&limit=100');
}

export function listUsers(params?: { role?: UserRole; is_active?: boolean; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.role) q.set('role', params.role);
  if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiRequest<PaginatedResponse<ApiUser>>(`/users${qs ? `?${qs}` : ''}`);
}

export function createUser(name: string, email: string) {
  return apiRequest<SuccessResponse<ApiUser>>('/users', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });
}

export function updateUser(
  id: number,
  patch: Partial<Pick<ApiUser, 'name' | 'email' | 'role' | 'is_active' | 'can_view_payments'>>,
) {
  return apiRequest<SuccessResponse<ApiUser>>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function listAuditLogs(params?: {
  action?: AuditLog['action'];
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.action) q.set('action', params.action);
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiRequest<PaginatedResponse<AuditLog>>(`/audit-logs${qs ? `?${qs}` : ''}`);
}

/** Revoga o link anterior e envia um convite novo. */
export function resendInvite(id: number) {
  return apiRequest<SuccessResponse<ApiUser>>(`/users/${id}/invite/resend`, { method: 'POST' });
}

export function cancelInvite(id: number) {
  return apiRequest<SuccessResponse<ApiUser>>(`/users/${id}/invite`, { method: 'DELETE' });
}
