import { apiRequest, type PaginatedResponse, type SuccessResponse } from './api';

export type EmailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'DEAD' | 'CANCELLED';
export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  PENDING: 'Na fila',
  SENDING: 'Enviando',
  SENT: 'Enviado',
  FAILED: 'Nova tentativa',
  DEAD: 'Não entregue',
  CANCELLED: 'Cancelado',
};

export const BREAKER_LABEL: Record<BreakerState, string> = {
  CLOSED: 'Operando',
  OPEN: 'Pausado',
  HALF_OPEN: 'Em teste',
};

export type EmailLog = {
  id: string;
  template_id: string;
  template_name: string;
  to: string[];
  subject: string | null;
  status: EmailStatus;
  attempts: number;
  provider: string | null;
  last_error: string | null;
  related_type: string | null;
  related_id: number | null;
  resent_from_id: string | null;
  resendable: boolean;
  created_at: string;
  next_attempt_at: string;
  sent_at: string | null;
};

export type EmailAttempt = {
  attempt: number;
  provider: string | null;
  success: boolean;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
};

export type EmailLogDetail = EmailLog & {
  cc: string[];
  bcc: string[];
  html: string | null;
  text: string | null;
  timeline: EmailAttempt[];
};

export type EmailType = { id: string; name: string };

export type ProviderHealth = {
  provider: string;
  state: BreakerState;
  consecutive_failures: number;
  opened_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
};

export type DailyCount = { day: string; sent: number; failed: number; dead: number };

export type EmailAlert = { kind: string; level: 'warning' | 'critical'; message: string };

export type EmailHealth = {
  providers: ProviderHealth[];
  queue_pending: number;
  oldest_pending_at: string | null;
  success_rate_24h: number | null;
  avg_delivery_seconds_24h: number | null;
  sent_24h: number;
  dead_24h: number;
  daily: DailyCount[];
  alerts: EmailAlert[];
};

export type EmailLogFilters = {
  inicio?: string;
  fim?: string;
  status?: EmailStatus;
  tipo?: string;
  busca?: string;
  related_type?: string;
  related_id?: number;
  page?: number;
  limit?: number;
};

export type ResendBatchResult = {
  resent: string[];
  skipped: { id: string; reason: string }[];
};

export function listEmailLogs(filters: EmailLogFilters): Promise<PaginatedResponse<EmailLog>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<PaginatedResponse<EmailLog>>(`/email-logs${suffix}`);
}

export async function getEmailLog(id: string): Promise<EmailLogDetail> {
  const res = await apiRequest<SuccessResponse<EmailLogDetail>>(`/email-logs/${id}`);
  return res.data;
}

export async function getEmailHealth(): Promise<EmailHealth> {
  const res = await apiRequest<SuccessResponse<EmailHealth>>('/email-logs/health');
  return res.data;
}

export async function listEmailTypes(): Promise<EmailType[]> {
  const res = await apiRequest<SuccessResponse<EmailType[]>>('/email-logs/types');
  return res.data;
}

export async function resendEmail(id: string): Promise<EmailLog> {
  const res = await apiRequest<SuccessResponse<EmailLog>>(`/email-logs/${id}/resend`, { method: 'POST' });
  return res.data;
}

export async function resendEmails(ids: string[]): Promise<ResendBatchResult> {
  const res = await apiRequest<SuccessResponse<ResendBatchResult>>('/email-logs/resend', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  return res.data;
}

export async function cancelEmail(id: string): Promise<EmailLog> {
  const res = await apiRequest<SuccessResponse<EmailLog>>(`/email-logs/${id}/cancel`, { method: 'POST' });
  return res.data;
}
