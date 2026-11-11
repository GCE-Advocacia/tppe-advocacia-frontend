import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getOfficeConfig } from '../services/officeConfigService';
import type { OfficeConfigAPI } from '../services/officeConfigService';

interface BrandingCtx {
  config: OfficeConfigAPI | null;
  loading: boolean;
}

const Ctx = createContext<BrandingCtx>({ config: null, loading: true });
const ActionsCtx = createContext<{ applyConfig: (config: OfficeConfigAPI) => void } | null>(null);
const CONFIG_UPDATED_KEY = 'advocacia_office_config_updated';
const REFRESH_INTERVAL_MS = 30_000;

/** Share logo state across routes without changing the existing OfficeConfigProvider. */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OfficeConfigAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  const lastRefresh = useRef(0);

  const applyConfig = useCallback((nextConfig: OfficeConfigAPI) => {
    // A slower public request must not replace a newly saved configuration.
    revision.current += 1;
    lastRefresh.current = Date.now();
    setConfig(nextConfig);
    setLoading(false);
    try {
      localStorage.setItem(CONFIG_UPDATED_KEY, `${Date.now()}-${Math.random()}`);
    } catch {
      // The configuration is still persisted by the API when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function refresh(force = false) {
      if (!force && Date.now() - lastRefresh.current < REFRESH_INTERVAL_MS) return;
      lastRefresh.current = Date.now();
      const requestRevision = ++revision.current;
      try {
        const nextConfig = await getOfficeConfig();
        if (active && requestRevision === revision.current) setConfig(nextConfig);
      } catch {
        // Keep the last known configuration (or the default logo) on network failure.
      } finally {
        if (active && requestRevision === revision.current) setLoading(false);
      }
    }

    const onFocus = () => { void refresh(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONFIG_UPDATED_KEY) void refresh(true);
    };

    void refresh(true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    let active = true;
    const update = (url: string, custom: boolean) => {
      if (!active) return;
      icon.href = url;
      icon.type = custom ? 'image/png' : 'image/svg+xml';
      icon.sizes.value = custom ? '256x256' : 'any';
    };
    const url = config?.favicon_url;
    if (!url) { update('/favicon.svg', false); return; }
    const probe = new Image();
    probe.onload = () => update(url, true);
    probe.onerror = () => update('/favicon.svg', false);
    probe.src = url;
    return () => { active = false; probe.onload = null; probe.onerror = null; };
  }, [config?.favicon_url]);

  return (
    <ActionsCtx.Provider value={{ applyConfig }}>
      <Ctx.Provider value={{ config, loading }}>{children}</Ctx.Provider>
    </ActionsCtx.Provider>
  );
}

export function useBranding() {
  return useContext(Ctx);
}

export function useBrandingActions() {
  const actions = useContext(ActionsCtx);
  if (!actions) throw new Error('useBrandingActions requires BrandingProvider');
  return actions;
}
