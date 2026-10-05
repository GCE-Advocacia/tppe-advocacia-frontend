import { createContext, useContext, useEffect, useState } from 'react';
import { getOfficeConfig } from '../services/officeConfigService';
import type { OfficeConfigAPI } from '../services/officeConfigService';

interface OfficeConfigCtx {
  config: OfficeConfigAPI | null;
  loading: boolean;
}

const Ctx = createContext<OfficeConfigCtx>({ config: null, loading: true });

export function OfficeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OfficeConfigAPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfficeConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (config?.color) {
      root.style.setProperty('--navy', config.color);
    }
    if (config?.color_bg_primary) {
      root.style.setProperty('--bg-primary', config.color_bg_primary);
    }
    if (config?.color_bg_secondary) {
      root.style.setProperty('--bg-secondary', config.color_bg_secondary);
    }
    if (config?.color_bg_sobre) {
      root.style.setProperty('--bg-sobre', config.color_bg_sobre);
    }
    if (config?.color_buttons) {
      root.style.setProperty('--btn-primary-bg', config.color_buttons);
    }
    if (config?.color_buttons_hover) {
      root.style.setProperty('--btn-primary-hover', config.color_buttons_hover);
    }
    if (config?.color_buttons_text) {
      root.style.setProperty('--btn-primary-text', config.color_buttons_text);
    }
    if (config?.color_title_primary) {
      root.style.setProperty('--title-primary', config.color_title_primary);
    }
    if (config?.color_title_secondary) {
      root.style.setProperty('--title-secondary', config.color_title_secondary);
    }
    if (config?.color_text_primary) {
      root.style.setProperty('--text-primary', config.color_text_primary);
    }
    if (config?.color_text_secondary) {
      root.style.setProperty('--text-secondary', config.color_text_secondary);
    }
    if (config?.color_link_primary) {
      root.style.setProperty('--link-primary', config.color_link_primary);
    }
    if (config?.color_link_secondary) {
      root.style.setProperty('--link-secondary', config.color_link_secondary);
    }
  }, [
    config?.color,
    config?.color_bg_primary,
    config?.color_bg_secondary,
    config?.color_bg_sobre,
    config?.color_buttons,
    config?.color_buttons_hover,
    config?.color_buttons_text,
    config?.color_title_primary,
    config?.color_title_secondary,
    config?.color_text_primary,
    config?.color_text_secondary,
    config?.color_link_primary,
    config?.color_link_secondary,
  ]);

  return <Ctx.Provider value={{ config, loading }}>{children}</Ctx.Provider>;
}

export function useOfficeConfig() {
  return useContext(Ctx);
}
