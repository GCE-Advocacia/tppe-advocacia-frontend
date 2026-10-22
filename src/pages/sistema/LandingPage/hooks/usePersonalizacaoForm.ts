import { useState, useCallback, useEffect } from 'react';
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
  const { applyConfig } = useBrandingActions();
  const [saved, setSaved] = useState<LandingPageData>(EMPTY_DATA);
  const [data, setData] = useState<LandingPageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Guarda de rota 2: alerta ao clicar em links internos com rascunhos não salvos
  useEffect(() => {
    if (!isDirty) return;
    const confirmInternalNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm('Existem alterações não salvas. Deseja sair e descartá-las?')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('click', confirmInternalNavigation, true);
    return () => document.removeEventListener('click', confirmInternalNavigation, true);
  }, [isDirty]);

  const set = useCallback(<K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  }, []);

  const discard = useCallback((themesCtrl?: PersonalizacaoThemesController) => {
    setData(saved);
    branding.discard();
    setSaveError(null);
    if (themesCtrl) {
      themesCtrl.setSelectedThemeId(saved.themeId ?? null);
      if (saved.themeId) {
        themesCtrl.setBaseThemeId(saved.themeId);
      }
    }
  }, [saved, branding]);

  const save = useCallback(async (themesCtrl: PersonalizacaoThemesController) => {
    if (saving || !isDirty || (branding.dirty && !branding.ready)) return;
    setSaveError(null);

    // CENÁRIO 2: Modificou cores de um tema pré-definido (ou sem tema vinculado)
    if (
      (!themesCtrl.baseTheme || themesCtrl.baseTheme.is_predefined || data.themeId === null) &&
      themesCtrl.isBaseThemeModified
    ) {
      const maxCustom = themesCtrl.themeQuota?.max_custom ?? 6;
      const customCount = themesCtrl.themeQuota
        ? themesCtrl.themeQuota.custom_count
        : themesCtrl.themes.filter(t => !t.is_predefined).length;

      if (customCount >= maxCustom) {
        setSaveError(
          `Limite máximo de ${maxCustom} temas personalizados atingido. Para salvar essas alterações, exclua um tema existente na biblioteca.`
        );
        return;
      }
      themesCtrl.openForkModal();
      return;
    }

    // CENÁRIO 1: Tema personalizado em edição OU alteração apenas de outros campos
    setSaving(true);
    try {
      await branding.save();
      if (formDirty) {
        if (themesCtrl.baseTheme && !themesCtrl.baseTheme.is_predefined && themesCtrl.isBaseThemeModified) {
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
            color_title_primary: data.colorTitlePrimary || '#FFFFFF',
            color_title_secondary: data.colorTitleSecondary || '#232C43',
            color_text_primary: data.colorTextPrimary || '#FFFFFF',
            color_text_secondary: data.colorTextSecondary || '#6B7280',
            color_link_primary: data.colorLinkPrimary || '#FFFFFF',
            color_link_secondary: data.colorLinkSecondary || '#661C16',
          });
        }

        const payloadData: LandingPageData = {
          ...data,
          themeId: themesCtrl.baseTheme ? themesCtrl.baseTheme.id : data.themeId,
        };
        const updated = await updateOfficeConfig(payloadData, applyConfig);
        setSaved(updated);
        setData(updated);
        if (updated.themeId) {
          themesCtrl.setSelectedThemeId(updated.themeId);
          themesCtrl.setBaseThemeId(updated.themeId);
        }
        await themesCtrl.fetchThemes();
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Erro ao salvar. Verifique sua conexão e tente novamente.'
      );
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
    saveError,
    setSaveError,
    branding,
    formDirty,
    isDirty,
    applyConfig,
    set,
    discard,
    save,
  };
}

export type PersonalizacaoFormController = ReturnType<typeof usePersonalizacaoForm>;
