import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOfficeConfigUI,
  updateOfficeConfig,
  updateTheme,
} from '../../../../services/officeConfigService';
import {
  EMPTY_DATA,
  EMPTY_DIFERENCIAIS,
  EMPTY_AREAS,
  deepEqual,
  type LandingPageData,
} from '../types';
import useBrandingDraft from '../../../../components/sistema/shared/Logo config/useBrandingDraft';
import { useBrandingActions } from '../../../../contexts/BrandingContext';
import type { PersonalizacaoThemesController } from './usePersonalizacaoThemes';

export function usePersonalizacaoForm() {
  const navigate = useNavigate();
  const { applyConfig } = useBrandingActions();
  const [saved, setSaved] = useState<LandingPageData>(EMPTY_DATA);
  const [data, setData] = useState<LandingPageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmThemeUpdate, setConfirmThemeUpdate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  const branding = useBrandingDraft();
  const formDirty = !deepEqual(data, saved);
  const isDirty = formDirty || branding.dirty;

  // Carregamento inicial das configurações
  useEffect(() => {
    getOfficeConfigUI()
      .then(cfg => {
        const merged: LandingPageData = {
          ...cfg,
          diferenciais: cfg.diferenciais.length > 0 ? cfg.diferenciais : EMPTY_DIFERENCIAIS,
          areas: cfg.areas.length > 0 ? cfg.areas : EMPTY_AREAS,
        };
        setSaved(merged);
        setData(merged);
      })
      .catch(() => {
        setLoadError('Não foi possível carregar as configurações. Recarregue a página.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Guarda de rota 1: alerta ao fechar a janela / dar F5 com rascunhos não salvos
  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  // Guarda de rota 2: modal ao clicar em links internos com rascunhos não salvos
  useEffect(() => {
    if (!isDirty) {
      setPendingNavigationPath(null);
      return;
    }
    const confirmInternalNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingNavigationPath(`${destination.pathname}${destination.search}${destination.hash}`);
    };
    document.addEventListener('click', confirmInternalNavigation, true);
    return () => document.removeEventListener('click', confirmInternalNavigation, true);
  }, [isDirty]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigationPath(null);
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!pendingNavigationPath) return;
    const targetPath = pendingNavigationPath;
    setPendingNavigationPath(null);
    navigate(targetPath);
  }, [pendingNavigationPath, navigate]);

  const set = useCallback(<K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => {
    setSaveError(null);
    setData(d => ({ ...d, [key]: value }));
  }, []);

  const discard = useCallback((themesCtrl?: PersonalizacaoThemesController) => {
    setData(saved);
    branding.discard();
    setSaveError(null);
    if (themesCtrl) {
      themesCtrl.setSelectedThemeId(saved.themeId ?? null);
      themesCtrl.setBaseThemeId(saved.themeId ?? null);
    }
  }, [saved, branding]);

  const save = useCallback(async (themesCtrl: PersonalizacaoThemesController, confirmed = false) => {
    if (saving || !isDirty || (branding.dirty && !branding.ready)) return;
    setSaveError(null);

    // CENÁRIO 2: Modificou cores de um tema pré-definido (ou sem tema vinculado)
    if (
      formDirty &&
      themesCtrl.isColorsDirty &&
      (!themesCtrl.baseTheme || themesCtrl.baseTheme.is_predefined || data.themeId === null) &&
      themesCtrl.isBaseThemeModified
    ) {
      themesCtrl.openForkModal();
      return;
    }

    if (formDirty && themesCtrl.baseTheme && !themesCtrl.baseTheme.is_predefined && themesCtrl.isBaseThemeModified && !confirmed) {
      setConfirmThemeUpdate(true);
      return;
    }

    // CENÁRIO 1: Tema personalizado em edição OU alteração apenas de outros campos
    setSaving(true);
    try {
      await branding.save();
      if (formDirty) {
        if (themesCtrl.isColorsDirty && themesCtrl.baseTheme && !themesCtrl.baseTheme.is_predefined && themesCtrl.isBaseThemeModified) {
          await updateTheme(themesCtrl.baseTheme.id, {
            name: themesCtrl.baseTheme.name,
            description: themesCtrl.baseTheme.description,
            color: data.color || '#232C43',
            color_bg_primary: data.colorBgPrimary || '#232C43',
            color_bg_secondary: data.colorBgSecondary || '#F5F3EF',
            color_bg_sobre: data.colorBgSobre || '#FFFFFF',
            color_buttons: data.colorButtons || '#661C16',
            color_buttons_hover: data.colorButtonsHover || '#A52020',
            color_buttons_text: data.colorButtonsText || '#FFFFFF',
            system_uses_landing_buttons: data.systemUsesLandingButtons ?? true,
            color_buttons_system: data.colorButtonsSystem || null,
            color_buttons_system_hover: data.colorButtonsSystemHover || null,
            color_buttons_system_text: data.colorButtonsSystemText || null,
            color_title_primary: data.colorTitlePrimary || '#FFFFFF',
            color_title_secondary: data.colorTitleSecondary || '#232C43',
            color_text_primary: data.colorTextPrimary || '#FFFFFF',
            color_text_secondary: data.colorTextSecondary || '#6B7280',
            color_link_primary: data.colorLinkPrimary || '#FFFFFF',
            color_link_secondary: data.colorLinkSecondary || '#661C16',
          });
        }

        const resolvedThemeId =
          themesCtrl.baseTheme &&
          (!themesCtrl.isBaseThemeModified || !themesCtrl.baseTheme.is_predefined)
            ? themesCtrl.baseTheme.id
            : null;
        const payloadData: LandingPageData = {
          ...data,
          themeId: resolvedThemeId,
        };
        const updated = await updateOfficeConfig(payloadData, applyConfig);
        setSaved(updated);
        setData(updated);
        themesCtrl.setSelectedThemeId(updated.themeId ?? null);
        themesCtrl.setBaseThemeId(updated.themeId ?? null);
        await themesCtrl.fetchThemes();
      }
      setConfirmThemeUpdate(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/networkerror|failed to fetch/i.test(msg)) {
        setSaveError('Falha na conexão com o servidor. Verifique sua conexão com a internet e tente novamente.');
      } else {
        setSaveError(msg || 'Erro ao salvar. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }, [saving, isDirty, branding, formDirty, data, applyConfig]);

  return {
    saved,
    setSaved,
    data,
    setData,
    loading,
    loadError,
    saving,
    confirmThemeUpdate,
    setConfirmThemeUpdate,
    saveError,
    setSaveError,
    branding,
    formDirty,
    isDirty,
    pendingNavigationPath,
    cancelNavigation,
    confirmNavigation,
    applyConfig,
    set,
    discard,
    save,
  };
}

export type PersonalizacaoFormController = ReturnType<typeof usePersonalizacaoForm>;
