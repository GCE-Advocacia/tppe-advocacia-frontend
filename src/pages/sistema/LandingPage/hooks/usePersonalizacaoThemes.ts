import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getThemes,
  createTheme,
  updateTheme,
  getThemeQuota,
  type ThemeQuota,
  type OfficeConfigAPI,
  updateOfficeConfig,
} from '../../../../services/officeConfigService';
import {
  DEFAULT_COLORS,
  type LandingPageData,
  type LandingPageTheme,
} from '../types';

export interface UsePersonalizacaoThemesProps {
  data: LandingPageData;
  saved: LandingPageData;
  loading: boolean;
  setData: React.Dispatch<React.SetStateAction<LandingPageData>>;
  setSaved: React.Dispatch<React.SetStateAction<LandingPageData>>;
}

export function usePersonalizacaoThemes({
  data,
  saved,
  loading,
  setData,
  setSaved,
}: UsePersonalizacaoThemesProps) {
  const [themes, setThemes] = useState<LandingPageTheme[]>([]);
  const [themeQuota, setThemeQuota] = useState<ThemeQuota | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [baseThemeId, setBaseThemeId] = useState<number | null>(null);

  // Modais de tema
  const [showThemeGalleryModal, setShowThemeGalleryModal] = useState(false);
  const [showSaveCurrentModal, setShowSaveCurrentModal] = useState(false);
  const [isForkingPredefined, setIsForkingPredefined] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDesc, setNewThemeDesc] = useState('');
  const [savingNewTheme, setSavingNewTheme] = useState(false);
  const [saveNewError, setSaveNewError] = useState<string | null>(null);

  const fetchThemes = useCallback(async () => {
    try {
      const [list, quota] = await Promise.all([getThemes(), getThemeQuota()]);
      setThemes(list);
      setThemeQuota(quota);
    } catch {
      // falha silenciosa
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const isColorMatching = useCallback((t: LandingPageTheme, currentColors: LandingPageData) => {
    return (
      t.color_bg_primary.toLowerCase() === (currentColors.colorBgPrimary || '').toLowerCase() &&
      t.color_bg_secondary.toLowerCase() === (currentColors.colorBgSecondary || '').toLowerCase() &&
      t.color_bg_sobre.toLowerCase() === (currentColors.colorBgSobre || '').toLowerCase() &&
      t.color_buttons.toLowerCase() === (currentColors.colorButtons || '').toLowerCase() &&
      t.color_buttons_hover.toLowerCase() === (currentColors.colorButtonsHover || '').toLowerCase() &&
      t.color_buttons_text.toLowerCase() === (currentColors.colorButtonsText || '').toLowerCase() &&
      t.color_title_primary.toLowerCase() === (currentColors.colorTitlePrimary || '').toLowerCase() &&
      t.color_title_secondary.toLowerCase() === (currentColors.colorTitleSecondary || '').toLowerCase() &&
      t.color_text_primary.toLowerCase() === (currentColors.colorTextPrimary || '').toLowerCase() &&
      t.color_text_secondary.toLowerCase() === (currentColors.colorTextSecondary || '').toLowerCase() &&
      t.color_link_primary.toLowerCase() === (currentColors.colorLinkPrimary || '').toLowerCase() &&
      t.color_link_secondary.toLowerCase() === (currentColors.colorLinkSecondary || '').toLowerCase()
    );
  }, []);

  // Tema de referência original (baseTheme): o último tema deliberadamente selecionado ou associado
  const baseTheme = useMemo(() => {
    if (data.themeId) {
      const found = themes.find(t => t.id === data.themeId);
      if (found) return found;
    }
    if (baseThemeId) {
      const found = themes.find(t => t.id === baseThemeId);
      if (found) return found;
    }
    const matched = themes.find(t => isColorMatching(t, data));
    if (matched) return matched;
    return themes.find(t => t.is_predefined) || themes[0] || null;
  }, [data.themeId, baseThemeId, themes, data, isColorMatching]);

  // Inicializa baseThemeId quando as configurações e temas estiverem disponíveis
  useEffect(() => {
    if (!loading && !baseThemeId && baseTheme) {
      setBaseThemeId(baseTheme.id);
    }
  }, [loading, baseThemeId, baseTheme]);

  // Reconcilia themeId salvo caso o banco de dados possua theme_id nulo
  useEffect(() => {
    if (themes.length > 0 && saved.themeId === null) {
      const match = themes.find(t => isColorMatching(t, saved));
      if (match) {
        setSaved(s => (s.themeId === null ? { ...s, themeId: match.id } : s));
        setData(d => (d.themeId === null ? { ...d, themeId: match.id } : d));
        setSelectedThemeId(prev => (prev === null ? match.id : prev));
        setBaseThemeId(prev => (prev === null ? match.id : prev));
      }
    }
  }, [themes, saved, isColorMatching, setSaved, setData]);

  // Verifica se as cores em edição divergiram do baseTheme
  const isBaseThemeModified = useMemo(() => {
    if (!baseTheme) return false;
    return !isColorMatching(baseTheme, data);
  }, [baseTheme, data, isColorMatching]);

  const updateColor = useCallback((key: keyof LandingPageData, value: string) => {
    setData(d => {
      const next: LandingPageData = { ...d, [key]: value };
      if (key === 'colorBgPrimary') {
        next.color = value;
      }
      if (baseTheme && !baseTheme.is_predefined) {
        next.themeId = baseTheme.id;
      } else if (baseTheme && isColorMatching(baseTheme, next)) {
        next.themeId = baseTheme.id;
      } else {
        next.themeId = null;
      }
      return next;
    });
  }, [baseTheme, isColorMatching, setData]);

  const restoreDefaultColors = useCallback(() => {
    setData(d => ({
      ...d,
      ...DEFAULT_COLORS,
    }));
  }, [setData]);

  const matchedTheme = useMemo(() => {
    const activeId = data.themeId ?? selectedThemeId;
    if (activeId) {
      const selected = themes.find(t => t.id === activeId);
      if (selected && isColorMatching(selected, data)) {
        return selected;
      }
    }

    if (baseTheme && isColorMatching(baseTheme, data)) {
      return baseTheme;
    }

    const matchingPredefined = themes.filter(t => t.is_predefined && isColorMatching(t, data));
    if (matchingPredefined.length > 0) {
      return matchingPredefined[0];
    }

    return null;
  }, [themes, data, selectedThemeId, baseTheme, isColorMatching]);

  const handleThemeSelected = useCallback((theme: LandingPageTheme) => {
    setBaseThemeId(theme.id);
    setSelectedThemeId(theme.id);
    setData(d => ({
      ...d,
      themeId: theme.id,
      color: theme.color,
      colorBgPrimary: theme.color_bg_primary,
      colorBgSecondary: theme.color_bg_secondary,
      colorBgSobre: theme.color_bg_sobre,
      colorButtons: theme.color_buttons,
      colorButtonsHover: theme.color_buttons_hover,
      colorButtonsText: theme.color_buttons_text,
      colorTitlePrimary: theme.color_title_primary,
      colorTitleSecondary: theme.color_title_secondary,
      colorTextPrimary: theme.color_text_primary,
      colorTextSecondary: theme.color_text_secondary,
      colorLinkPrimary: theme.color_link_primary,
      colorLinkSecondary: theme.color_link_secondary,
    }));
  }, [setData]);

  const handleSelectFromLibrary = useCallback((theme: LandingPageTheme) => {
    handleThemeSelected(theme);
    setShowThemeGalleryModal(false);
  }, [handleThemeSelected]);

  const openForkModal = useCallback((defaultName?: string) => {
    setIsForkingPredefined(true);
    setNewThemeName(defaultName || (baseTheme ? `${baseTheme.name} (Personalizado)` : ''));
    setNewThemeDesc('');
    setSaveNewError(null);
    setShowSaveCurrentModal(true);
  }, [baseTheme]);

  const openCopyModal = useCallback((defaultName?: string) => {
    setIsForkingPredefined(false);
    setNewThemeName(defaultName || (baseTheme ? `${baseTheme.name} (Cópia)` : ''));
    setNewThemeDesc('');
    setSaveNewError(null);
    setShowSaveCurrentModal(true);
  }, [baseTheme]);

  const closeSaveModal = useCallback(() => {
    setShowSaveCurrentModal(false);
    setIsForkingPredefined(false);
  }, []);

  const handleSaveCurrentAsTheme = useCallback(async (
    brandingSave: () => Promise<void>,
    applyConfig?: (cfg: OfficeConfigAPI) => void
  ) => {
    if (!newThemeName.trim()) {
      setSaveNewError('Informe um nome para o tema.');
      return;
    }
    setSavingNewTheme(true);
    setSaveNewError(null);
    try {
      await brandingSave();
      const created = await createTheme({
        name: newThemeName.trim(),
        description: newThemeDesc.trim() || null,
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

      const updated = await updateOfficeConfig({ ...data, themeId: created.id }, applyConfig);
      setSaved(updated);
      setData(updated);
      setBaseThemeId(created.id);
      setSelectedThemeId(created.id);

      await fetchThemes();
      setShowSaveCurrentModal(false);
      setIsForkingPredefined(false);
      setNewThemeName('');
      setNewThemeDesc('');
    } catch (err) {
      setSaveNewError(err instanceof Error ? err.message : 'Erro ao criar tema.');
    } finally {
      setSavingNewTheme(false);
    }
  }, [newThemeName, newThemeDesc, data, applyConfig, fetchThemes, setData, setSaved]);

  return {
    themes,
    themeQuota,
    fetchThemes,
    selectedThemeId,
    setSelectedThemeId,
    baseThemeId,
    setBaseThemeId,
    baseTheme,
    matchedTheme,
    isBaseThemeModified,
    isColorMatching,
    updateColor,
    restoreDefaultColors,
    handleThemeSelected,
    handleSelectFromLibrary,
    // Modais
    showThemeGalleryModal,
    setShowThemeGalleryModal,
    showSaveCurrentModal,
    isForkingPredefined,
    newThemeName,
    setNewThemeName,
    newThemeDesc,
    setNewThemeDesc,
    savingNewTheme,
    saveNewError,
    openForkModal,
    openCopyModal,
    closeSaveModal,
    handleSaveCurrentAsTheme,
  };
}

export type PersonalizacaoThemesController = ReturnType<typeof usePersonalizacaoThemes>;
