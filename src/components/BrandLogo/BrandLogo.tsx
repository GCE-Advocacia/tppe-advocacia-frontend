import { useState } from 'react';
import { useBranding } from '../../contexts/BrandingContext';
import type { OfficeConfigAPI } from '../../services/officeConfigService';
import styles from './BrandLogo.module.css';

export type LogoBackground = 'dark' | 'light';
export type LogoScope = 'landing' | 'system';

/** Select the image for the surface, without changing any theme colors. */
export function resolveLogo(config: OfficeConfigAPI | null, scope: LogoScope, background: LogoBackground): string {
  const system = scope === 'system' && config?.system_uses_landing_logo === false;
  const base = system ? config?.system_logo_url : config?.logo_url;
  const dark = system ? config?.system_logo_dark_url : config?.logo_dark_url;
  const shared = system ? config?.system_logo_same_for_themes : config?.logo_same_for_themes;
  const custom = background === 'dark' && shared === false ? dark : base;
  return custom?.trim() || (background === 'light' ? '/logo-dark.png' : '/logo.png');
}

function landingBackground(color: string): LogoBackground {
  // Let the browser resolve every format accepted by the color picker (hex,
  // RGB and HSL), including alpha over the page's white background.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
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
}

interface BrandLogoProps {
  className?: string;
  background?: LogoBackground | 'auto';
  scope?: LogoScope;
}

export default function BrandLogo({ className = '', background = 'dark', scope = 'landing' }: BrandLogoProps) {
  const { config } = useBranding();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const surface = background === 'auto'
    ? landingBackground(config?.color_bg_primary || config?.color || '#232C43') : background;
  const source = resolveLogo(config, scope, surface);
  const fallback = surface === 'light' ? '/logo-dark.png' : '/logo.png';
  return (
    <img
      src={source === failedSource ? fallback : source}
      alt={config?.office_name ? `Logo de ${config.office_name}` : 'Logo do escritório'}
      className={`${styles.logo} ${className}`}
      onError={source !== fallback && source !== failedSource ? () => setFailedSource(source) : undefined}
      decoding="async"
    />
  );
}
