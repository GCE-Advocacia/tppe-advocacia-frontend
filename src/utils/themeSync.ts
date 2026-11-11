import type { OfficeConfigAPI } from '../services/officeConfigService';

export const THEME_CACHE_KEY = 'advocacia_theme_cache';
export const SYSTEM_THEME_MODE_KEY = 'advocacia_system_theme_mode';

export type SystemThemeMode = 'highlights' | 'immersive';

export function buildThemeTokens(config: Partial<OfficeConfigAPI> | null | undefined): Record<string, string> {
  const brandPrimary = config?.color || config?.color_bg_primary || '#232C43';
  const brandPrimaryText = config?.color_text_primary || config?.color_title_primary || '#FFFFFF';

  const usesLandingButtons = config?.system_uses_landing_buttons ?? true;
  const brandAccent = (!usesLandingButtons && config?.color_buttons_system)
    ? config.color_buttons_system
    : (config?.color_buttons || '#111827');
  const brandAccentHover = (!usesLandingButtons && config?.color_buttons_system_hover)
    ? config.color_buttons_system_hover
    : (config?.color_buttons_hover || config?.color_buttons || '#1F2937');
  const brandAccentText = (!usesLandingButtons && config?.color_buttons_system_text)
    ? config.color_buttons_system_text
    : (config?.color_buttons_text || '#FFFFFF');

  const brandTitle = config?.color_title_secondary || '#232C43';
  const brandLink = config?.color_link_secondary || config?.color_buttons || '#661C16';

  const bgPrimary = config?.color_bg_primary || config?.color || '#232C43';
  const bgSecondary = config?.color_bg_secondary || '#F5F3EF';
  const bgSobre = config?.color_bg_sobre || '#FFFFFF';
  const btnPrimaryBg = config?.color_buttons || '#661C16';
  const btnPrimaryHover = config?.color_buttons_hover || config?.color_buttons || '#A52020';
  const btnPrimaryText = config?.color_buttons_text || '#FFFFFF';
  const titlePrimary = config?.color_title_primary || '#FFFFFF';
  const titleSecondary = config?.color_title_secondary || '#232C43';
  const textPrimary = config?.color_text_primary || '#FFFFFF';
  const textSecondary = config?.color_text_secondary || '#6B7280';
  const linkPrimary = config?.color_link_primary || '#FFFFFF';
  const linkSecondary = config?.color_link_secondary || '#661C16';

  return {
    '--brand-primary': brandPrimary,
    '--brand-primary-text': brandPrimaryText,
    '--brand-accent': brandAccent,
    '--brand-accent-hover': brandAccentHover,
    '--brand-accent-text': brandAccentText,
    '--brand-title': brandTitle,
    '--brand-link': brandLink,

    '--bg-primary': bgPrimary,
    '--bg-secondary': bgSecondary,
    '--bg-sobre': bgSobre,
    '--btn-primary-bg': btnPrimaryBg,
    '--btn-primary-hover': btnPrimaryHover,
    '--btn-primary-text': btnPrimaryText,
    '--title-primary': titlePrimary,
    '--title-secondary': titleSecondary,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--link-primary': linkPrimary,
    '--link-secondary': linkSecondary,
  };
}

export function getEffectiveSystemThemeMode(): SystemThemeMode {
  if (typeof window === 'undefined') return 'highlights';
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('themeMode');
    if (fromUrl === 'immersive' || fromUrl === 'highlights') {
      localStorage.setItem(SYSTEM_THEME_MODE_KEY, fromUrl);
      return fromUrl;
    }
    const fromStorage = localStorage.getItem(SYSTEM_THEME_MODE_KEY);
    if (fromStorage === 'immersive' || fromStorage === 'highlights') {
      return fromStorage;
    }
  } catch {
    // localStorage not accessible
  }
  return 'highlights';
}

export function setSystemThemeMode(mode: SystemThemeMode): void {
  try {
    localStorage.setItem(SYSTEM_THEME_MODE_KEY, mode);
  } catch {
    // Ignore error
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.systemThemeMode = mode;
  }
}

export function applyThemeTokensToRoot(
  tokens: Record<string, string>,
  mode: SystemThemeMode = getEffectiveSystemThemeMode(),
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    if (value) {
      root.style.setProperty(key, value);
    }
  }
  root.dataset.systemThemeMode = mode;
}

export function persistThemeCache(config: Partial<OfficeConfigAPI> | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    const tokens = buildThemeTokens(config);
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(tokens));
  } catch {
    // localStorage may be disabled or quota exceeded
  }
}

export function resolveSurfaceContrast(color: string): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) return 'dark';
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = '#232C43';
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b > .179 ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
