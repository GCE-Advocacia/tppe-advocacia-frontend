import {
  apiDownload,
  apiRequest,
  PaginatedResponse,
  SuccessResponse,
} from './api';

export type ProcessStatus = 'ATIVO' | 'SUSPENSO' | 'ARQUIVADO' | 'ENCERRADO';

export type ProcessListItem = {
  id: number;
  number: string;
  client_id: number | null;
  client_name: string | null;
  court: string;
  tribunal_alias: string | null;
  action_type: string;
  status: ProcessStatus;
  created_at: string;
};

export type ProcessDetail = ProcessListItem & {
  opposing_party: string | null;
  created_by: number | null;
  updated_by: number | null;
  updated_at: string;
};

export type ClientListItem = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  cnpj: string | null;
};

export type Movement = {
  id: number;
  process_id: number;
  title: string;
  description: string | null;
  occurred_at: string;
  source: 'MANUAL' | 'SYSTEM';
  external_id: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
};

export type ProcessCreate = {
  number: string;
  client_id: number | null;
  court: string;
  tribunal_alias: string | null;
  action_type: string;
  opposing_party: string | null;
};

export type MovementCreate = {
  title: string;
  description?: string;
  occurred_at?: string;
};

export type ProcessNote = {
  id: number;
  process_id: number;
  created_by: number | null;
  updated_by: number | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DataJudSyncResult = {
  process_id: number;
  process_number: string;
  tribunal_alias: string;
  imported_count: number;
  skipped_count: number;
  external_api_log_id: number;
  synced_at: string;
  movements: Movement[];
};

export async function listProcesses(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProcessStatus | '';
} = {}): Promise<PaginatedResponse<ProcessListItem>> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  return apiRequest(`/processes?${query}`);
}

export async function listClients(): Promise<PaginatedResponse<ClientListItem>> {
  return apiRequest('/clients?limit=100');
}

export async function createProcess(
  payload: ProcessCreate,
): Promise<ProcessDetail> {
  const response = await apiRequest<SuccessResponse<ProcessDetail>>('/processes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getProcess(processId: number): Promise<ProcessDetail> {
  const response = await apiRequest<SuccessResponse<ProcessDetail>>(
    `/processes/${processId}`,
  );
  return response.data;
}

export async function listMovements(
  processId: number,
): Promise<PaginatedResponse<Movement>> {
  return apiRequest(`/processes/${processId}/movements?limit=100`);
}

export async function createMovement(
  processId: number,
  payload: MovementCreate,
): Promise<Movement> {
  const response = await apiRequest<SuccessResponse<Movement>>(
    `/processes/${processId}/movements`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function changeProcessStatus(
  processId: number,
  status: ProcessStatus,
): Promise<ProcessDetail> {
  const response = await apiRequest<SuccessResponse<ProcessDetail>>(
    `/processes/${processId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
  return response.data;
}

export async function syncProcessWithDataJud(
  processId: number,
): Promise<DataJudSyncResult> {
  const response = await apiRequest<SuccessResponse<DataJudSyncResult>>(
    `/processes/${processId}/sync`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return response.data;
}

export async function listProcessNotes(
  processId: number,
): Promise<PaginatedResponse<ProcessNote>> {
  return apiRequest(`/processes/${processId}/notes?limit=100`);
}

export async function createProcessNote(
  processId: number,
  content: string,
): Promise<ProcessNote> {
  const response = await apiRequest<SuccessResponse<ProcessNote>>(
    `/processes/${processId}/notes`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );
  return response.data;
}

export async function updateProcessNote(
  processId: number,
  noteId: number,
  content: string,
): Promise<ProcessNote> {
  const response = await apiRequest<SuccessResponse<ProcessNote>>(
    `/processes/${processId}/notes/${noteId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    },
  );
  return response.data;
}

export type ProcessDocument = {
  id: number;
  process_id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
};

export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';
export const DOCUMENT_MAX_SIZE_MB = 20;

export async function listProcessDocuments(
  processId: number,
): Promise<PaginatedResponse<ProcessDocument>> {
  return apiRequest(`/processes/${processId}/documents?limit=100`);
}

export async function uploadProcessDocument(
  processId: number,
  file: File,
): Promise<ProcessDocument> {
  const form = new FormData();
  form.append('file', file);
  const response = await apiRequest<SuccessResponse<ProcessDocument>>(
    `/processes/${processId}/documents`,
    { method: 'POST', body: form },
  );
  return response.data;
}

export async function downloadProcessDocument(
  processId: number,
  doc: ProcessDocument,
): Promise<void> {
  const blob = await apiDownload(`/processes/${processId}/documents/${doc.id}/download`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.original_name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function deleteProcessDocument(
  processId: number,
  documentId: number,
): Promise<void> {
  await apiRequest<void>(`/processes/${processId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export type BulkSyncResult = {
  tribunal_alias: string | null;
  total_active_processes: number;
  processed_count: number;
  success_count: number;
  failure_count: number;
  imported_count: number;
  skipped_count: number;
  synced_at: string;
  results: unknown[];
};

export async function syncActiveProcesses(params: {
  tribunal_alias?: string | null;
  limit?: number;
} = {}): Promise<BulkSyncResult> {
  const response = await apiRequest<SuccessResponse<BulkSyncResult>>(
    '/datajud/sync-active-processes',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  );
  return response.data;
}
