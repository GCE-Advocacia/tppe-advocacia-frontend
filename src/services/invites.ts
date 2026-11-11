import { apiRequest, setAccessToken, SuccessResponse } from './api';

export interface InviteInfo {
  name: string;
  email: string;
}

export async function getInvite(token: string): Promise<InviteInfo> {
  const response = await apiRequest<SuccessResponse<InviteInfo>>(
    `/invites/${encodeURIComponent(token)}`,
    { authenticated: false },
  );
  return response.data;
}

/** Define a senha pelo convite e já deixa a sessão aberta. */
export async function acceptInvite(token: string, password: string): Promise<void> {
  const response = await apiRequest<SuccessResponse<{ access_token: string; token_type: string }>>(
    `/invites/${encodeURIComponent(token)}/accept`,
    { method: 'POST', authenticated: false, body: JSON.stringify({ password }) },
  );
  setAccessToken(response.data.access_token);
}
