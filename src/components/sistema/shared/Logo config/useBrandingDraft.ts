import { useEffect, useRef, useState } from 'react';
import { useBranding, useBrandingActions } from '../../../../contexts/BrandingContext';
import {
  LOGO_FIELDS, DEFAULT_LOGO_FIELDS, previewOfficeLogo, resetOfficeLogo, updateLogoSettings, setOfficeLogoDefault,
  uploadOfficeLogo, validateLogoFile,
} from '../../../../services/officeConfigService';
import type { LogoSettings as LogoPreferences, LogoSlot } from '../../../../services/officeConfigService';

export type AssetDraft = { kind: 'reset'; factory: boolean } | { kind: 'default' } | {
  kind: 'upload'; makeDefault: boolean; file: File; preview: string | null; status: 'loading' | 'ready' | 'error';
};
type Drafts = Partial<Record<LogoSlot, AssetDraft>>;
const LABELS: Record<LogoSlot, string> = {
  'landing-light': 'a logo da landing page para fundo claro',
  'landing-dark': 'a logo da landing page para fundo escuro',
  'system-light': 'a logo do sistema para fundo claro',
  'system-dark': 'a logo do sistema para fundo escuro',
  favicon: 'o ícone do navegador',
};

/** Images and sharing choices are drafts until the page's Save action is used. */
export default function useBrandingDraft() {
  const { config, loading } = useBranding();
  const { applyConfig } = useBrandingActions();
  const [assets, setAssets] = useState<Drafts>({});
  const [errors, setErrors] = useState<Partial<Record<LogoSlot, string>>>({});
  const [choices, setChoices] = useState<Partial<LogoPreferences>>({});
  const requests = useRef(new Map<LogoSlot, AbortController>());
  const previews = useRef(new Map<LogoSlot, string>());
  const preferences: LogoPreferences = {
    logo_same_for_themes: config?.logo_same_for_themes !== false,
    system_logo_same_for_themes: config?.system_logo_same_for_themes !== false,
    system_uses_landing_logo: config?.system_uses_landing_logo !== false,
    ...choices,
  };
  const pendingChoices = Object.fromEntries(Object.entries(choices).filter(
    ([key, value]) => value !== (config?.[key as keyof LogoPreferences] !== false),
  )) as Partial<LogoPreferences>;
  const dirty = Object.keys(assets).length > 0 || Object.keys(pendingChoices).length > 0;
  const ready = !loading && !!config && Object.values(assets).every(
    asset => asset.kind !== 'upload' || asset.status === 'ready',
  );

  function release(slot: LogoSlot) {
    requests.current.get(slot)?.abort();
    requests.current.delete(slot);
    const preview = previews.current.get(slot);
    if (preview) URL.revokeObjectURL(preview);
    previews.current.delete(slot);
  }

  useEffect(() => () => {
    requests.current.forEach(controller => controller.abort());
    previews.current.forEach(url => URL.revokeObjectURL(url));
    requests.current.clear();
    previews.current.clear();
  }, []);

  function undo(slot: LogoSlot) {
    release(slot);
    setAssets(previous => { const next = { ...previous }; delete next[slot]; return next; });
    setErrors(previous => { const next = { ...previous }; delete next[slot]; return next; });
  }

  function discard() {
    Object.keys(LOGO_FIELDS).forEach(slot => release(slot as LogoSlot));
    setAssets({}); setErrors({}); setChoices({});
  }

  async function select(slot: LogoSlot, file: File) {
    undo(slot);
    const error = validateLogoFile(file);
    if (error) { setErrors(previous => ({ ...previous, [slot]: error })); return; }
    const controller = new AbortController();
    requests.current.set(slot, controller);
    setAssets(previous => ({ ...previous, [slot]: { kind: 'upload', file, makeDefault: false, preview: null, status: 'loading' } }));
    try {
      const blob = await previewOfficeLogo(file, slot, controller.signal);
      if (controller.signal.aborted) return;
      const preview = URL.createObjectURL(blob);
      previews.current.set(slot, preview);
      setAssets(previous => {
        const pending = previous[slot];
        return { ...previous, [slot]: { kind: 'upload', file, makeDefault: pending?.kind === 'upload' && pending.makeDefault, preview, status: 'ready' } };
      });
    } catch (reason) {
      if (controller.signal.aborted) return;
      setAssets(previous => ({ ...previous, [slot]: { kind: 'upload', file, makeDefault: false, preview: null, status: 'error' } }));
      setErrors(previous => ({ ...previous, [slot]: reason instanceof Error ? reason.message : 'Não foi possível preparar a imagem.' }));
    } finally {
      if (requests.current.get(slot) === controller) requests.current.delete(slot);
    }
  }

  function previewFailed(slot: LogoSlot, file: File) {
    setAssets(previous => {
      const asset = previous[slot];
      if (asset?.kind !== 'upload' || asset.file !== file) return previous;
      return { ...previous, [slot]: { ...asset, status: 'error' } };
    });
    setErrors(previous => ({ ...previous, [slot]: 'Não foi possível ler a imagem. Selecione outro arquivo.' }));
  }

  function restore(slot: LogoSlot, factory = false) {
    undo(slot);
    const savedDefault = config?.[DEFAULT_LOGO_FIELDS[slot]] || null;
    const target = factory ? null : savedDefault;
    if ((config?.[LOGO_FIELDS[slot]] || null) !== target || (factory && savedDefault)) {
      setAssets(previous => ({ ...previous, [slot]: { kind: 'reset', factory } }));
    }
  }

  function makeDefault(slot: LogoSlot, value: boolean) {
    const asset = assets[slot];
    if (asset?.kind === 'upload') {
      setAssets(previous => {
        const current = previous[slot];
        if (current?.kind !== 'upload' || current.file !== asset.file) return previous;
        return { ...previous, [slot]: { ...current, makeDefault: value } };
      });
    } else if (value && config?.[LOGO_FIELDS[slot]]) {
      setAssets(previous => ({ ...previous, [slot]: { kind: 'default' } }));
    } else {
      undo(slot);
    }
  }

  function changePreference(key: keyof LogoPreferences, value: boolean) {
    setChoices(previous => ({ ...previous, [key]: value }));
  }

  async function save() {
    if (!dirty) return;
    if (!ready) throw new Error('Aguarde a preparação das imagens ou corrija os arquivos indicados.');
    // Each API operation commits independently. Clear only successful changes so
    // a failed request can be retried without re-uploading images already saved.
    for (const [key, draft] of Object.entries(assets)) {
      const slot = key as LogoSlot;
      try {
        const updated = draft.kind === 'reset'
          ? await resetOfficeLogo(slot, draft.factory)
          : draft.kind === 'default' ? await setOfficeLogoDefault(slot)
          : await uploadOfficeLogo(draft.file, slot, draft.makeDefault);
        applyConfig(updated);
        undo(slot);
      } catch (reason) {
        const detail = reason instanceof Error ? reason.message : 'Tente novamente.';
        throw new Error(`Não foi possível salvar ${LABELS[slot]}. ${detail} As alterações restantes continuam pendentes.`);
      }
    }
    if (Object.keys(pendingChoices).length) {
      try {
        applyConfig(await updateLogoSettings(pendingChoices));
        setChoices({});
      } catch {
        throw new Error('Não foi possível salvar as opções das logos. As alterações restantes continuam pendentes. Tente novamente.');
      }
    }
  }

  return { config, loading, assets, errors, preferences, dirty, ready, select, restore, undo, discard, changePreference, makeDefault, previewFailed, save };
}

export type BrandingDraft = ReturnType<typeof useBrandingDraft>;
