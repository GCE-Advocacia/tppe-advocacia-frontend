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
