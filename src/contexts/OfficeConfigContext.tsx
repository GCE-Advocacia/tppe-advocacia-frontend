import { createContext, useContext, useEffect } from 'react';
import { useBranding } from './BrandingContext';
import type { OfficeConfigAPI } from '../services/officeConfigService';
import {
  applyThemeTokensToRoot,
  buildThemeTokens,
  getEffectiveSystemThemeMode,
  persistThemeCache,
  THEME_CACHE_KEY,
  SYSTEM_THEME_MODE_KEY,
} from '../utils/themeSync';

/** Apply only the saved geometry globally; keep the existing landing color scope. */
export function OfficeButtonRadius() {
  const { config } = useBranding();
  const radius = config?.button_radius ?? '6px';

  useEffect(() => {
    document.documentElement.style.setProperty('--btn-radius', radius);
  }, [radius]);

  return null;
}

interface OfficeConfigCtx {
  config: OfficeConfigAPI | null;
  loading: boolean;
}

const Ctx = createContext<OfficeConfigCtx>({ config: null, loading: true });

export function OfficeConfigProvider({ children }: { children: React.ReactNode }) {
  const { config, loading } = useBranding();

  useEffect(() => {
    if (!config) return;
    const tokens = buildThemeTokens(config);
    applyThemeTokensToRoot(tokens, getEffectiveSystemThemeMode());
    persistThemeCache(config);
  }, [config]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyThemeTokensToRoot(parsed, getEffectiveSystemThemeMode());
        } catch {
          // ignore error
        }
      } else if (e.key === SYSTEM_THEME_MODE_KEY && e.newValue) {
        if (e.newValue === 'immersive' || e.newValue === 'highlights') {
          document.documentElement.dataset.systemThemeMode = e.newValue;
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <Ctx.Provider value={{ config, loading }}>{children}</Ctx.Provider>;
}

export function useOfficeConfig() {
  return useContext(Ctx);
}
