import { apiRequest, SuccessResponse } from './api';

export type GoogleDriveStatus = {
  connected: boolean;
  email: string | null;
};

export async function getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  const res = await apiRequest<SuccessResponse<GoogleDriveStatus>>(
    '/integrations/google-drive/status',
  );
  return res.data;
}

export async function getGoogleDriveAuthUrl(): Promise<string> {
  const res = await apiRequest<SuccessResponse<{ auth_url: string }>>(
    '/integrations/google-drive/auth-url',
  );
  return res.data.auth_url;
}

export async function disconnectGoogleDrive(): Promise<void> {
  await apiRequest('/integrations/google-drive', { method: 'DELETE' });
}
