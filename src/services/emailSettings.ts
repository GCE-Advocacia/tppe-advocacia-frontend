import { apiRequest, SuccessResponse } from './api';

export type EmailProvider = 'smtp' | 'resend';
export type EmailSecurity = 'starttls' | 'ssl' | 'none';
export type ConnectionStep = 'connect' | 'ehlo' | 'tls' | 'auth';

export interface EmailProfile {
  id: number;
  name: string;
  priority: number;
  provider: EmailProvider;
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
}

/** O que a tela manda. `secret` vazio mantém a senha já salva. */
export interface EmailProfileForm {
  provider: EmailProvider;
  host: string;
  port: number | null;
  security: EmailSecurity;
  username: string;
  secret: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  is_active: boolean;
}

export interface ConnectionStepResult {
  step: ConnectionStep;
  ok: boolean;
  duration_ms: number;
  error: string | null;
}

export interface ConnectionTestResult {
  ok: boolean;
  steps: ConnectionStepResult[];
}

export interface TestSendResult {
  provider: string;
  message_id: string;
  duration_ms: number;
}

export async function listEmailProfiles(): Promise<EmailProfile[]> {
  const response = await apiRequest<SuccessResponse<EmailProfile[]>>('/email-settings/profiles');
  return response.data;
}

export async function saveEmailProfile(
  id: number,
  form: EmailProfileForm,
  version: number,
): Promise<EmailProfile> {
  const response = await apiRequest<SuccessResponse<EmailProfile>>(`/email-settings/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...form, version }),
  });
  return response.data;
}

export async function testEmailConnection(
  id: number,
  form: EmailProfileForm,
): Promise<ConnectionTestResult> {
  const response = await apiRequest<SuccessResponse<ConnectionTestResult>>(
    `/email-settings/profiles/${id}/test-connection`,
    { method: 'POST', body: JSON.stringify(form) },
  );
  return response.data;
}

export async function sendTestEmail(id: number, to: string): Promise<TestSendResult> {
  const response = await apiRequest<SuccessResponse<TestSendResult>>(
    `/email-settings/profiles/${id}/test-send`,
    { method: 'POST', body: JSON.stringify({ to }) },
  );
  return response.data;
}
