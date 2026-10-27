import { apiRequest, SuccessResponse, type PermissionKey } from './api';

export interface Permission {
  key: PermissionKey;
  name: string;
  description: string;
  sort_order: number;
}

export async function listPermissions(): Promise<Permission[]> {
  const response = await apiRequest<SuccessResponse<Permission[]>>('/permissions');
  return response.data;
}
