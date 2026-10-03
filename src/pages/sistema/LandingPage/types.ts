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
