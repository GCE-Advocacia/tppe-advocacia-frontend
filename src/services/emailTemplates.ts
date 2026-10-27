import { apiRequest, SuccessResponse } from './api';

export type EmailTemplate = {
  id: string;
  name: string;
  description: string;
};

export type EmailPreviewFormat = 'html' | 'text';

export type EmailTemplatePreview = {
  id: string;
  format: EmailPreviewFormat;
  subject: string;
  content: string;
};

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const response = await apiRequest<SuccessResponse<EmailTemplate[]>>('/email/templates');
  return response.data;
}

export async function previewEmailTemplate(
  id: string,
  format: EmailPreviewFormat,
): Promise<EmailTemplatePreview> {
  const response = await apiRequest<SuccessResponse<EmailTemplatePreview>>(
    `/email/templates/${encodeURIComponent(id)}/preview?format=${format}`,
  );
  return response.data;
}
