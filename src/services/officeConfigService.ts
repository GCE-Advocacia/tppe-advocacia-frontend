import { apiRequest, getAccessToken, clearAccessToken, ApiError } from './api';
import type { SuccessResponse } from './api';
import type { LandingPageData } from '../pages/sistema/LandingPage/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

export interface OfficeConfigAPI {
  id: number;
  office_name: string | null;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  whatsapp_url: string | null;
  website_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  hero_image_position: string | null;
  about_title: string | null;
  about_description: string | null;
  about_image_url: string | null;
  about_image_position: string | null;
  lawyer_name: string | null;
  lawyer_oab: string | null;
  lawyer_description: string | null;
  lawyer_image_url: string | null;
  lawyer_image_position: string | null;
  differentials: { title: string; description: string }[];
  areas_of_practice: { title: string; description: string }[];
  color: string | null;
  color_bg_primary: string | null;
  color_bg_secondary: string | null;
  color_bg_sobre: string | null;
  color_buttons: string | null;
  color_title_primary: string | null;
  color_title_secondary: string | null;
  color_text_primary: string | null;
  color_text_secondary: string | null;
  color_link_primary: string | null;
  color_link_secondary: string | null;
}

function parsePos(s: string | null): { x: number; y: number } {
  if (!s) return { x: 50, y: 50 };
  const [x, y] = s.split(',').map(Number);
  return (isNaN(x) || isNaN(y)) ? { x: 50, y: 50 } : { x, y };
}

function apiToUI(api: OfficeConfigAPI): LandingPageData {
  return {
    email: api.email ?? '',
    endereco: api.address ?? '',
    telefone: api.phone ?? '',
    linkedin: api.linkedin_url ?? '',
    instagram: api.instagram_url ?? '',
    whatsapp: api.whatsapp_url ?? '',
    website: api.website_url ?? '',
    heroTitulo: api.hero_title ?? '',
    heroSubtexto: api.hero_subtitle ?? '',
    heroImagem: api.hero_image_url ?? '',
    heroImagemPos: parsePos(api.hero_image_position),
    escritorioTitulo: api.about_title ?? '',
    escritorioConteudo: api.about_description ?? '',
    escritorioImagem: api.about_image_url ?? '',
    escritorioImagemPos: parsePos(api.about_image_position),
    advogadoTitulo: api.lawyer_name ?? '',
    advogadoOab: api.lawyer_oab ?? '',
    advogadoConteudo: api.lawyer_description ?? '',
    advogadoImagem: api.lawyer_image_url ?? '',
    advogadoImagemPos: parsePos(api.lawyer_image_position),
    diferenciais: (api.differentials ?? []).map((d, i) => ({
      id: i + 1,
      titulo: d.title,
      descricao: d.description,
    })),
    areas: (api.areas_of_practice ?? []).map((a, i) => ({
      id: i + 1,
      titulo: a.title,
      descricao: a.description,
    })),
    color: api.color ?? '#232C43',
    colorBgPrimary: api.color_bg_primary ?? '#232C43',
    colorBgSecondary: api.color_bg_secondary ?? '#F5F3EF',
    colorBgSobre: api.color_bg_sobre ?? '#FFFFFF',
    colorButtons: api.color_buttons ?? '#661C16',
    colorTitlePrimary: api.color_title_primary ?? '#FFFFFF',
    colorTitleSecondary: api.color_title_secondary ?? '#232C43',
    colorTextPrimary: api.color_text_primary ?? '#FFFFFF',
    colorTextSecondary: api.color_text_secondary ?? '#6B7280',
    colorLinkPrimary: api.color_link_primary ?? '#FFFFFF',
    colorLinkSecondary: api.color_link_secondary ?? '#661C16',
  };
}

function uiToApi(ui: LandingPageData): Omit<OfficeConfigAPI, 'id' | 'cnpj' | 'office_name'> {
  return {
    email: ui.email || null,
    address: ui.endereco || null,
    phone: ui.telefone || null,
    linkedin_url: ui.linkedin || null,
    instagram_url: ui.instagram || null,
    whatsapp_url: ui.whatsapp || null,
    website_url: ui.website || null,
    hero_title: ui.heroTitulo || null,
    hero_subtitle: ui.heroSubtexto || null,
    hero_image_url: ui.heroImagem || null,
    hero_image_position: `${Math.round(ui.heroImagemPos.x)},${Math.round(ui.heroImagemPos.y)}`,
    about_title: ui.escritorioTitulo || null,
    about_description: ui.escritorioConteudo || null,
    about_image_url: ui.escritorioImagem || null,
    about_image_position: `${Math.round(ui.escritorioImagemPos.x)},${Math.round(ui.escritorioImagemPos.y)}`,
    lawyer_name: ui.advogadoTitulo || null,
    lawyer_oab: ui.advogadoOab || null,
    lawyer_description: ui.advogadoConteudo || null,
    lawyer_image_url: ui.advogadoImagem || null,
    lawyer_image_position: `${Math.round(ui.advogadoImagemPos.x)},${Math.round(ui.advogadoImagemPos.y)}`,
    differentials: ui.diferenciais.map(d => ({ title: d.titulo, description: d.descricao })),
    areas_of_practice: ui.areas.map(a => ({ title: a.titulo, description: a.descricao })),
    color: ui.color || null,
    color_bg_primary: ui.colorBgPrimary || null,
    color_bg_secondary: ui.colorBgSecondary || null,
    color_bg_sobre: ui.colorBgSobre || null,
    color_buttons: ui.colorButtons || null,
    color_title_primary: ui.colorTitlePrimary || null,
    color_title_secondary: ui.colorTitleSecondary || null,
    color_text_primary: ui.colorTextPrimary || null,
    color_text_secondary: ui.colorTextSecondary || null,
    color_link_primary: ui.colorLinkPrimary || null,
    color_link_secondary: ui.colorLinkSecondary || null,
  };
}

export async function getOfficeConfig(): Promise<OfficeConfigAPI> {
  const res = await apiRequest<SuccessResponse<OfficeConfigAPI>>('/office-config', {
    authenticated: false,
  });
  return res.data;
}

export async function getOfficeConfigUI(): Promise<LandingPageData> {
  return apiToUI(await getOfficeConfig());
}

export async function updateOfficeConfig(ui: LandingPageData): Promise<LandingPageData> {
  const payload = uiToApi(ui);
  const res = await apiRequest<SuccessResponse<OfficeConfigAPI>>('/office-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    authenticated: true,
  });
  return apiToUI(res.data);
}

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE:    'Arquivo muito grande. O limite é 5 MB.',
  INVALID_MIME_TYPE: 'Tipo de arquivo não permitido. Envie uma imagem.',
  VALIDATION_ERROR:  'Arquivo inválido.',
  UNAUTHORIZED:      'Sessão expirada. Faça login novamente.',
};

export async function uploadMedia(file: File): Promise<string> {
  const token = getAccessToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/media/upload`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (res.status === 401) {
    clearAccessToken();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new ApiError('Não autorizado', 401, 'UNAUTHORIZED');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { code?: string } };
    const code = body?.error?.code ?? '';
    throw new ApiError(
      UPLOAD_ERROR_MESSAGES[code] ?? 'Falha no upload. Tente novamente.',
      res.status,
      code,
    );
  }

  const body = (await res.json()) as SuccessResponse<{ url: string }>;
  return body.data.url;
}
