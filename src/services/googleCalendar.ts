import { apiRequest, SuccessResponse } from './api';

export type GoogleStatus = {
  connected: boolean;
  connected_at: string | null;
  scope: string | null;
};

export type GoogleSyncResult = {
  total: number;
  synced: number;
  failed: number;
};

export type GooglePullResult = {
  created: number;
  updated: number;
  deleted: number;
};

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const res = await apiRequest<SuccessResponse<GoogleStatus>>(
    '/integrations/google/status',
  );
  return res.data;
}

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await apiRequest<SuccessResponse<{ auth_url: string }>>(
    '/integrations/google/auth-url',
  );
  return res.data.auth_url;
}

export async function disconnectGoogle(): Promise<void> {
  await apiRequest('/integrations/google', { method: 'DELETE' });
}

export async function syncAllToGoogle(): Promise<GoogleSyncResult> {
  const res = await apiRequest<SuccessResponse<GoogleSyncResult>>(
    '/integrations/google/sync-all',
    { method: 'POST' },
  );
  return res.data;
}

export async function pullFromGoogle(): Promise<GooglePullResult> {
  const res = await apiRequest<SuccessResponse<GooglePullResult>>(
    '/integrations/google/pull',
    { method: 'POST' },
  );
  return res.data;
}
