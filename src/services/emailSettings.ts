import { apiRequest, SuccessResponse } from './api';

export type EmailSecurity = 'starttls' | 'ssl' | 'none';
export type ConnectionStep = 'connect' | 'ehlo' | 'tls' | 'auth';
export type PresetId = 'gmail' | 'outlook' | 'hostinger' | 'locaweb' | 'other';
export type EmailAccount = 'own' | 'system';
export type EmailHealthState = 'ok' | 'degraded' | 'down';

/** Conta própria do escritório. A senha nunca volta: só `has_secret`. */
export interface EmailProfile {
  id: number;
  name: string;
  priority: number;
  provider: string;
  preset: PresetId | null;
  host: string | null;
  port: number | null;
  security: EmailSecurity;
  username: string | null;
  has_secret: boolean;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  version: number;
  updated_by: number | null;
  updated_at: string;
  warnings: string[];
}

/** O que o assistente manda. `secret` vazio mantém a senha já salva. */
export interface EmailAccountForm {
  preset: PresetId;
  host: string;
  port: number | null;
  security: EmailSecurity;
  username: string;
  secret: string;
  from_email: string;
  is_active: boolean;
}

export interface EmailIdentity {
  from_name: string | null;
  reply_to: string | null;
  version: number;
  updated_at: string | null;
}

export interface EmailOverview {
  identity: EmailIdentity;
  own_account: EmailProfile | null;
  system_account_email: string | null;
  system_account_configured: boolean;
}

export interface ProviderPreset {
  id: PresetId;
  name: string;
  host: string | null;
  port: number | null;
  security: EmailSecurity;
  password_help: string;
  help_url: string | null;
  sender_must_match: boolean;
}

export interface EmailStatus {
  state: EmailHealthState;
  message: string;
  account: EmailAccount;
  account_email: string | null;
  own_account_configured: boolean;
  own_account_error: string | null;
  last_sent_at: string | null;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
}

export interface ConnectionStepResult {
  step: ConnectionStep;
  ok: boolean;
  duration_ms: number;
  error: string | null;
  hint: string | null;
}

export interface ConnectionTestResult {
  ok: boolean;
  steps: ConnectionStepResult[];
}

export interface TestSendMeResult {
  to: string;
  account: EmailAccount;
  fallback_used: boolean;
  duration_ms: number;
}

export async function getEmailOverview(): Promise<EmailOverview> {
  const response = await apiRequest<SuccessResponse<EmailOverview>>('/email-settings');
  return response.data;
}

export async function getEmailStatus(): Promise<EmailStatus> {
  const response = await apiRequest<SuccessResponse<EmailStatus>>('/email-settings/status');
  return response.data;
}

export async function listEmailPresets(): Promise<ProviderPreset[]> {
  const response = await apiRequest<SuccessResponse<ProviderPreset[]>>('/email-settings/presets');
  return response.data;
}

export async function saveEmailIdentity(
  identity: { from_name: string; reply_to: string },
  version: number,
): Promise<EmailIdentity> {
  const response = await apiRequest<SuccessResponse<EmailIdentity>>('/email-settings/identity', {
    method: 'PUT',
    body: JSON.stringify({ ...identity, version }),
  });
  return response.data;
}

export async function saveEmailAccount(
  id: number,
  form: EmailAccountForm,
  version: number,
): Promise<EmailProfile> {
  const response = await apiRequest<SuccessResponse<EmailProfile>>(`/email-settings/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...form, version }),
  });
  return response.data;
}

export async function testEmailAccount(
  id: number,
  form: EmailAccountForm,
): Promise<ConnectionTestResult> {
  const response = await apiRequest<SuccessResponse<ConnectionTestResult>>(
    `/email-settings/profiles/${id}/test-connection`,
    { method: 'POST', body: JSON.stringify(form) },
  );
  return response.data;
}

export async function sendTestToMe(): Promise<TestSendMeResult> {
  const response = await apiRequest<SuccessResponse<TestSendMeResult>>(
    '/email-settings/test-send-me',
    { method: 'POST' },
  );
  return response.data;
}
