export interface Diferencial {
  id: number;
  titulo: string;
  descricao: string;
}

export interface AreaAtuacao {
  id: number;
  titulo: string;
  descricao: string;
}

export interface LandingPageData {
  // Dados Institucionais
  email: string;
  endereco: string;
  telefone: string;

  // Links
  linkedin: string;
  instagram: string;
  whatsapp: string;
  website: string;

  // Hero
  heroTitulo: string;
  heroSubtexto: string;
  heroImagem: string;
  heroImagemPos: { x: number; y: number };

  // Sobre Escritório
  escritorioTitulo: string;
  escritorioConteudo: string;
  escritorioImagem: string;
  escritorioImagemPos: { x: number; y: number };

  // Sobre Advogado
  advogadoTitulo: string;
  advogadoOab: string;
  advogadoConteudo: string;
  advogadoImagem: string;
  advogadoImagemPos: { x: number; y: number };

  // Diferenciais
  diferenciais: Diferencial[];

  // Áreas
  areas: AreaAtuacao[];

  buttonRadius: string;

  // Cores
  color: string;
  colorBgPrimary: string;
  colorBgSecondary: string;
  colorBgSobre: string;
  colorButtons: string;
  colorButtonsHover: string;
  colorButtonsText: string;
  colorTitlePrimary: string;
  colorTitleSecondary: string;
  colorTextPrimary: string;
  colorTextSecondary: string;
  colorLinkPrimary: string;
  colorLinkSecondary: string;
  themeId?: number | null;

  // Botões do Sistema (quando desacoplados da Landing Page)
  systemUsesLandingButtons?: boolean;
  colorButtonsSystem?: string | null;
  colorButtonsSystemHover?: string | null;
  colorButtonsSystemText?: string | null;
}

export interface LandingPageTheme {
  id: number;
  name: string;
  description: string | null;
  is_predefined: boolean;
  color: string;
  color_bg_primary: string;
  color_bg_secondary: string;
  color_bg_sobre: string;
  color_buttons: string;
  color_buttons_hover: string;
  color_buttons_text: string;
  system_uses_landing_buttons?: boolean;
  color_buttons_system?: string | null;
  color_buttons_system_hover?: string | null;
  color_buttons_system_text?: string | null;
  color_title_primary: string;
  color_title_secondary: string;
  color_text_primary: string;
  color_text_secondary: string;
  color_link_primary: string;
  color_link_secondary: string;
  created_at?: string;
  updated_at?: string;
}

export type ThemeCreatePayload = Omit<LandingPageTheme, 'id' | 'is_predefined' | 'created_at' | 'updated_at'>;
export type ThemeUpdatePayload = Partial<ThemeCreatePayload>;

export const EMPTY_DIFERENCIAIS: Diferencial[] = [
  { id: 1, titulo: '', descricao: '' },
  { id: 2, titulo: '', descricao: '' },
  { id: 3, titulo: '', descricao: '' },
];

export const EMPTY_AREAS: AreaAtuacao[] = [
  { id: 1, titulo: '', descricao: '' },
  { id: 2, titulo: '', descricao: '' },
  { id: 3, titulo: '', descricao: '' },
  { id: 4, titulo: '', descricao: '' },
  { id: 5, titulo: '', descricao: '' },
  { id: 6, titulo: '', descricao: '' },
];

export const DEFAULT_COLORS = {
  color: '#232C43',
  colorBgPrimary: '#232C43',
  colorBgSecondary: '#F5F3EF',
  colorBgSobre: '#FFFFFF',
  colorButtons: '#661C16',
  colorButtonsHover: '#A52020',
  colorButtonsText: '#FFFFFF',
  colorTitlePrimary: '#FFFFFF',
  colorTitleSecondary: '#232C43',
  colorTextPrimary: '#FFFFFF',
  colorTextSecondary: '#6B7280',
  colorLinkPrimary: '#FFFFFF',
  colorLinkSecondary: '#661C16',
  systemUsesLandingButtons: false,
  colorButtonsSystem: '#111827',
  colorButtonsSystemHover: '#1F2937',
  colorButtonsSystemText: '#FFFFFF',
};

export const EMPTY_DATA: LandingPageData = {
  email: '', endereco: '', telefone: '',
  linkedin: '', instagram: '', whatsapp: '', website: '',
  heroTitulo: '', heroSubtexto: '', heroImagem: '', heroImagemPos: { x: 50, y: 50 },
  escritorioTitulo: '', escritorioConteudo: '', escritorioImagem: '', escritorioImagemPos: { x: 50, y: 50 },
  advogadoTitulo: '', advogadoOab: '', advogadoConteudo: '', advogadoImagem: '', advogadoImagemPos: { x: 50, y: 50 },
  diferenciais: EMPTY_DIFERENCIAIS,
  areas: EMPTY_AREAS,
  buttonRadius: '6px',
  ...DEFAULT_COLORS,
  themeId: null,
};

export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

