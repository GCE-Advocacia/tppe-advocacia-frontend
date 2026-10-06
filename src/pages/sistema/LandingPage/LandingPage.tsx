import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Building2, Link2, Star, BookOpen, UserRound,
  Shield, MapPin, ImageIcon, Pencil, Check, X, Loader2, Palette, Info,
} from 'lucide-react';
import { ApiError } from '../../../services/api';
import {
  getOfficeConfigUI,
  updateOfficeConfig,
  uploadMedia,
  getThemes,
  createTheme,
  updateTheme,
  getThemeQuota,
  type ThemeQuota,
} from '../../../services/officeConfigService';
import type { LandingPageData, Diferencial, AreaAtuacao, LandingPageTheme } from './types';
import ImagePositionModal from '../../../components/sistema/shared/ImagePositionModal';
import ColorPicker from '../../../components/sistema/shared/ColorPicker';
import ThemeGallery from '../../../components/sistema/shared/ThemeGallery';
import LogoSettings from '../../../components/sistema/shared/Logo config/LogoSettings';
import useBrandingDraft from '../../../components/sistema/shared/Logo config/useBrandingDraft';
import { useBrandingActions } from '../../../contexts/BrandingContext';

const EMPTY_DIFERENCIAIS: Diferencial[] = [
  { id: 1, titulo: '', descricao: '' },
  { id: 2, titulo: '', descricao: '' },
  { id: 3, titulo: '', descricao: '' },
];

const EMPTY_AREAS: AreaAtuacao[] = [
  { id: 1, titulo: '', descricao: '' },
  { id: 2, titulo: '', descricao: '' },
  { id: 3, titulo: '', descricao: '' },
  { id: 4, titulo: '', descricao: '' },
  { id: 5, titulo: '', descricao: '' },
  { id: 6, titulo: '', descricao: '' },
];

const EMPTY_DATA: LandingPageData = {
  email: '', endereco: '', telefone: '',
  linkedin: '', instagram: '', whatsapp: '', website: '',
  heroTitulo: '', heroSubtexto: '', heroImagem: '', heroImagemPos: { x: 50, y: 50 },
  escritorioTitulo: '', escritorioConteudo: '', escritorioImagem: '', escritorioImagemPos: { x: 50, y: 50 },
  advogadoTitulo: '', advogadoOab: '', advogadoConteudo: '', advogadoImagem: '', advogadoImagemPos: { x: 50, y: 50 },
  diferenciais: EMPTY_DIFERENCIAIS,
  areas: EMPTY_AREAS,
  color: '#232C43',
  colorBgPrimary: '#232C43',
  colorBgSecondary: '#F5F3EF',
  colorBgSobre: '#FFFFFF',
  colorButtons: '#661C16',
  colorButtonsHover: '#A52020',
  colorButtonsText: '#FFFFFF',
  colorTitlePrimary: '#FFFFFF',
  colorTitleSecondary: '#232C43',
  colorTextPrimary: '#FFFFFF',
  colorTextSecondary: '#6B7280',
  colorLinkPrimary: '#FFFFFF',
  colorLinkSecondary: '#661C16',
  themeId: null,
};
import styles from './LandingPage.module.css';

// ── helpers ──────────────────────────────────────────────
function deepEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── sub-components ───────────────────────────────────────
interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  hint: string;
  size: string;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  aspectRatio?: number;
  posLabel?: string;
}
function ImageUpload({ value, onChange, hint, size, position = { x: 50, y: 50 }, onPositionChange, aspectRatio = 1, posLabel = 'Imagem' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMedia(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div
        className={styles.imgBox}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {value ? (
          <>
            <div className={styles.imgWithPos}>
              <img
                src={value} alt="preview" className={styles.imgPreview}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
              />
            </div>
            <div className={styles.imgActions}>
              {onPositionChange && (
                <button className={styles.imgBtnSecondary} onClick={() => setShowModal(true)}>
                  Reposicionar
                </button>
              )}
              <button className={styles.imgBtn} disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading ? 'Enviando...' : 'Trocar Imagem'}
              </button>
            </div>
            {error && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</p>}
          </>
        ) : (
          <>
            {uploading
              ? <Loader2 size={32} className={styles.imgIcon} style={{ animation: 'spin 1s linear infinite' }} />
              : <ImageIcon size={32} className={styles.imgIcon} />
            }
            <p className={styles.imgHint}>{hint}</p>
            <p className={styles.imgSize}>A imagem deve ser {size}.</p>
            {error && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</p>}
            <button className={styles.imgBtn} disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? 'Enviando...' : 'Carregar Imagem'}
            </button>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {showModal && value && onPositionChange && (
        <ImagePositionModal
          src={value}
          position={position}
          aspectRatio={aspectRatio}
          label={posLabel}
          onConfirm={pos => { onPositionChange(pos); setShowModal(false); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface SectionCardProps { icon: React.ReactNode; title: string; children: React.ReactNode; }
function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h2 className={styles.cardTitle}>{title}</h2>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

interface FieldProps { label: string; tooltip?: string; children: React.ReactNode; }
function Field({ label, tooltip, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        <span>{label}</span>
        {tooltip && (
          <span className={styles.tooltipWrapper} tabIndex={0} aria-label={tooltip}>
            <Info size={13} className={styles.tooltipIcon} />
            <span className={styles.tooltipText}>{tooltip}</span>
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// ── main page ────────────────────────────────────────────
export default function LandingPageConfig() {
  const { applyConfig } = useBrandingActions();
  const [saved,   setSaved]   = useState<LandingPageData>(EMPTY_DATA);
  const [data,    setData]    = useState<LandingPageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const branding = useBrandingDraft();
  const formDirty = !deepEqual(data, saved);
  const isDirty = formDirty || branding.dirty;

  useEffect(() => {
    getOfficeConfigUI()
      .then(cfg => {
        const merged: LandingPageData = {
          ...cfg,
          diferenciais: cfg.diferenciais.length > 0 ? cfg.diferenciais : EMPTY_DIFERENCIAIS,
          areas:        cfg.areas.length        > 0 ? cfg.areas        : EMPTY_AREAS,
        };
        setSaved(merged);
        setData(merged);
        if (merged.themeId) {
          setSelectedThemeId(merged.themeId);
          setBaseThemeId(merged.themeId);
        }
      })
      .catch(() => { setLoadError('Não foi possível carregar as configurações. Recarregue a página.'); })
      .finally(() => setLoading(false));
  }, []);

  const set = useCallback(<K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  }, []);

  const discard = () => {
    setData(saved);
    branding.discard();
    setSaveError(null);
    setSelectedThemeId(saved.themeId ?? null);
    if (saved.themeId) {
      setBaseThemeId(saved.themeId);
    }
  };

  const [themeQuota, setThemeQuota] = useState<ThemeQuota | null>(null);
  const [isForkingPredefined, setIsForkingPredefined] = useState(false);

  // ── Gestão de Temas e Cores (US09 v2.1) ──
  const [showThemeGalleryModal, setShowThemeGalleryModal] = useState(false);
  const [themes, setThemes] = useState<LandingPageTheme[]>([]);
  const [showSaveCurrentModal, setShowSaveCurrentModal] = useState(false);
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

  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [baseThemeId, setBaseThemeId] = useState<number | null>(null);

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

  // Inicializa baseThemeId apenas quando as configurações e temas estiverem disponíveis
  useEffect(() => {
    if (!loading && !baseThemeId && baseTheme) {
      setBaseThemeId(baseTheme.id);
    }
  }, [loading, baseThemeId, baseTheme]);

  // Reconcilia themeId salvo e local caso o banco de dados possua theme_id nulo (legado/inicial),
  // mas as cores salvas coincidam 100% com um tema cadastrado (ex: Clássico Navy pré-definido)
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
  }, [themes, saved, isColorMatching]);

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
        // Se estiver editando um tema personalizado, mantém a referência ao tema para atualizá-lo ao salvar
        next.themeId = baseTheme.id;
      } else if (baseTheme && isColorMatching(baseTheme, next)) {
        // Se for pré-definido e as cores ainda coincidirem 100%, mantém o ID do tema de fábrica
        next.themeId = baseTheme.id;
      } else {
        // Se for pré-definido e divergiu, desvincula temporariamente (exige novo tema ao salvar)
        next.themeId = null;
      }
      return next;
    });
  }, [baseTheme, isColorMatching]);

  const matchedTheme = useMemo(() => {
    // 1. Se houver themeId definido no formulário ou selecionado pelo usuário:
    const activeId = data.themeId ?? selectedThemeId;
    if (activeId) {
      const selected = themes.find(t => t.id === activeId);
      if (selected && isColorMatching(selected, data)) {
        return selected;
      }
    }

    // 2. Se as cores ainda coincidem exatamente com o baseTheme:
    if (baseTheme && isColorMatching(baseTheme, data)) {
      return baseTheme;
    }

    // 3. Caso contrário, apenas temas pré-definidos do sistema podem ser inferidos automaticamente
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
  }, []);

  const handleSelectFromLibrary = useCallback((theme: LandingPageTheme) => {
    handleThemeSelected(theme);
    setShowThemeGalleryModal(false);
  }, [handleThemeSelected]);

  const save = async () => {
    if (saving || !isDirty || (branding.dirty && !branding.ready)) return;
    setSaving(true);
    setSaveError(null);

    // CENÁRIO 2: Modificou cores de um tema pré-definido (ou sem tema vinculado)
    // Como a Landing Page exige pertencer a um tema e pré-definidos são imutáveis,
    // interceptamos para salvar como novo tema personalizado.
    if ((!baseTheme || baseTheme.is_predefined || data.themeId === null) && isBaseThemeModified) {
      const maxCustom = themeQuota?.max_custom ?? 6;
      const customCount = themeQuota ? themeQuota.custom_count : themes.filter(t => !t.is_predefined).length;
      if (customCount >= maxCustom) {
        setSaveError(
          `Limite máximo de ${maxCustom} temas personalizados atingido. Para salvar essas alterações, exclua um tema existente na biblioteca.`
        );
        return;
      }
      setIsForkingPredefined(true);
      setNewThemeName(baseTheme ? `${baseTheme.name} (Personalizado)` : '');
      setNewThemeDesc('');
      setSaveNewError(null);
      setShowSaveCurrentModal(true);
      return;
    }

    // CENÁRIO 1: Tema personalizado em edição OU alteração apenas de outros campos (texto, imagens, etc.)
    setSaving(true);
    try {
      await branding.save();
      if (formDirty) {
        // Se for um tema personalizado com cores modificadas, atualiza o modelo do tema no banco primeiro
        if (baseTheme && !baseTheme.is_predefined && isBaseThemeModified) {
          await updateTheme(baseTheme.id, {
            name: baseTheme.name,
            description: baseTheme.description,
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

        // Persiste a Landing Page em office_config mantendo o theme_id ativo
        const payloadData: LandingPageData = {
          ...data,
          themeId: baseTheme ? baseTheme.id : data.themeId,
        };
        const updated = await updateOfficeConfig(payloadData, applyConfig);
        setSaved(updated);
        setData(updated);
        if (updated.themeId) {
          setSelectedThemeId(updated.themeId);
          setBaseThemeId(updated.themeId);
        }
        await fetchThemes();
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Erro ao salvar. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCurrentAsTheme = async () => {
    if (!newThemeName.trim()) {
      setSaveNewError('Informe um nome para o tema.');
      return;
    }
    setSavingNewTheme(true);
    setSaveNewError(null);
    try {
      await branding.save();
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

      // Vincula o novo tema à Landing Page e persiste em office_config
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
  };



  // Diferencial inline edit
  const [editingDif, setEditingDif] = useState<number | null>(null);
  const updateDif = (id: number, field: keyof Diferencial, value: string) =>
    set('diferenciais', data.diferenciais.map(d => d.id === id ? { ...d, [field]: value } : d));

  // Área inline edit
  const [editingArea, setEditingArea] = useState<number | null>(null);
  const updateArea = (id: number, field: keyof AreaAtuacao, value: string) =>
    set('areas', data.areas.map(a => a.id === id ? { ...a, [field]: value } : a));

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#666' }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <p style={{ color: '#c0392b', fontSize: '0.95rem' }}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Configuração da Landing Page</h1>

      <SectionCard icon={<ImageIcon size={20} />} title="Logos e ícone do navegador">
        <LogoSettings draft={branding} saving={saving} />
      </SectionCard>

      {/* ── Dados Institucionais ── */}
      <SectionCard icon={<Building2 size={20} />} title="Dados Institucionais">
        <div className={styles.row2}>
          <div>
            <Field label="E-MAIL DE CONTATO">
              <input className={styles.input} value={data.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="TELEFONE">
              <input className={styles.input} value={data.telefone} onChange={e => set('telefone', e.target.value)} />
            </Field>
          </div>
          <Field label="ENDEREÇO">
            <textarea className={styles.textarea} rows={5} value={data.endereco} onChange={e => set('endereco', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      {/* ── Links ── */}
      <SectionCard icon={<Link2 size={20} />} title="Links">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles.row2}>
          <Field label="LINKEDIN DO ADVOGADO">
            <input className={styles.input} value={data.linkedin} onChange={e => set('linkedin', e.target.value)} />
          </Field>
          <Field label="INSTAGRAM DO ADVOGADO">
            <input className={styles.input} value={data.instagram} onChange={e => set('instagram', e.target.value)} />
          </Field>
        </div>
        <div className={styles.row2}>
          <Field label="WHATSAPP">
            <input className={styles.input} value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </Field>
          <Field label="SITE DO ESCRITÓRIO">
            <input className={styles.input} value={data.website} onChange={e => set('website', e.target.value)} />
          </Field>
        </div>
        </div>
      </SectionCard>

      {/* ── Hero ── */}
      <SectionCard icon={<Star size={20} />} title="Hero (Destaque Principal)">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DO IMPACTO">
              <input className={styles.input} value={data.heroTitulo} onChange={e => set('heroTitulo', e.target.value)} />
            </Field>
            <Field label="SUBTEXTO DE APOIO">
              <textarea className={styles.textarea} rows={3} value={data.heroSubtexto} onChange={e => set('heroSubtexto', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM (HERO)">
            <ImageUpload
              value={data.heroImagem} onChange={v => set('heroImagem', v)}
              hint="Adicione uma imagem profissional que será principal da Landing Page."
              size="420px por 600px"
              position={data.heroImagemPos}
              onPositionChange={pos => set('heroImagemPos', pos)}
              aspectRatio={420 / 600}
              posLabel="Hero"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Sobre Escritório ── */}
      <SectionCard icon={<BookOpen size={20} />} title="Sobre Escritório">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DA SEÇÃO">
              <input className={styles.input} value={data.escritorioTitulo} onChange={e => set('escritorioTitulo', e.target.value)} />
            </Field>
            <Field label="CONTEÚDO DESCRITIVO">
              <textarea className={styles.textarea} rows={5} value={data.escritorioConteudo} onChange={e => set('escritorioConteudo', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM DO ESCRITÓRIO">
            <ImageUpload
              value={data.escritorioImagem} onChange={v => set('escritorioImagem', v)}
              hint="Adicione uma imagem profissional que ficará no sobre da Landing Page."
              size="500px por 575px"
              position={data.escritorioImagemPos}
              onPositionChange={pos => set('escritorioImagemPos', pos)}
              aspectRatio={500 / 575}
              posLabel="Sobre Escritório"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Sobre Advogado ── */}
      <SectionCard icon={<UserRound size={20} />} title="Sobre Advogado">
        <div className={styles.row2}>
          <div>
            <Field label="TÍTULO DA SEÇÃO">
              <input className={styles.input} value={data.advogadoTitulo} onChange={e => set('advogadoTitulo', e.target.value)} />
            </Field>
            <Field label="OAB">
              <input className={styles.input} value={data.advogadoOab} onChange={e => set('advogadoOab', e.target.value)} />
            </Field>
            <Field label="CONTEÚDO DESCRITIVO">
              <textarea className={styles.textarea} rows={4} value={data.advogadoConteudo} onChange={e => set('advogadoConteudo', e.target.value)} />
            </Field>
          </div>
          <Field label="IMAGEM DO ADVOGADO">
            <ImageUpload
              value={data.advogadoImagem} onChange={v => set('advogadoImagem', v)}
              hint="Adicione uma imagem profissional do advogado que ficará no sobre da Landing Page."
              size="475px por 600px"
              position={data.advogadoImagemPos}
              onPositionChange={pos => set('advogadoImagemPos', pos)}
              aspectRatio={475 / 600}
              posLabel="Sobre o Advogado"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Diferenciais ── */}
      <SectionCard icon={<Shield size={20} />} title="Diferenciais">
        <div className={styles.grid3}>
          {data.diferenciais.map(d => (
            <div key={d.id} className={`${styles.listCard} ${editingDif === d.id ? styles.listCardEditing : ''}`}>
              {editingDif === d.id ? (
                <>
                  <input className={styles.inlineInput} value={d.titulo} onChange={e => updateDif(d.id, 'titulo', e.target.value)} />
                  <textarea className={styles.inlineTextarea} rows={3} value={d.descricao} onChange={e => updateDif(d.id, 'descricao', e.target.value)} />
                  <button className={styles.iconBtnGreen} onClick={() => setEditingDif(null)}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <p className={styles.listCardTitle}>{d.titulo}</p>
                  <p className={styles.listCardDesc}>{d.descricao}</p>
                  <div className={styles.listCardActions}>
                    <button className={styles.iconBtnGray} onClick={() => setEditingDif(d.id)}><Pencil size={13} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Áreas de Atuação ── */}
      <SectionCard icon={<MapPin size={20} />} title="Áreas de Atuação">
        <div className={styles.grid3}>
          {data.areas.map(a => (
            <div key={a.id} className={`${styles.listCard} ${editingArea === a.id ? styles.listCardEditing : ''}`}>
              {editingArea === a.id ? (
                <>
                  <input className={styles.inlineInput} value={a.titulo} onChange={e => updateArea(a.id, 'titulo', e.target.value)} />
                  <textarea className={styles.inlineTextarea} rows={3} value={a.descricao} onChange={e => updateArea(a.id, 'descricao', e.target.value)} />
                  <button className={styles.iconBtnGreen} onClick={() => setEditingArea(null)}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <p className={styles.listCardTitle}>{a.titulo}</p>
                  <p className={styles.listCardDesc}>{a.descricao}</p>
                  <div className={styles.listCardActions}>
                    <button className={styles.iconBtnGray} onClick={() => setEditingArea(a.id)}><Pencil size={13} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Identidade Visual / Cores (US09 v2.1) ── */}
      <SectionCard icon={<Palette size={20} />} title="Cores da Landing Page">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Barra Superior: Tema Base Ativo e Ações Rápidas */}
          <div className={styles.themeSelectorBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                Tema Base:
              </span>
              {matchedTheme ? (
                <span className={styles.themeActiveBadge}>
                  <Palette size={14} />
                  {matchedTheme.name}
                  {matchedTheme.is_predefined && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: 4 }}>• Pré-definido</span>
                  )}
                </span>
              ) : baseTheme && !baseTheme.is_predefined ? (
                <span
                  className={styles.themeActiveBadge}
                  style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                  title="Alterações pendentes. Ao clicar em 'Salvar alterações', este tema personalizado e a Landing Page serão atualizados juntos."
                >
                  <Palette size={14} />
                  {baseTheme.name}
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, marginLeft: 4 }}>• em edição</span>
                </span>
              ) : (
                <span
                  className={styles.themeCustomBadge}
                  title="Cores modificadas a partir de tema de fábrica. Ao clicar em 'Salvar alterações', você criará um novo tema personalizado."
                >
                  {baseTheme ? `Baseado em: ${baseTheme.name} (modificado)` : '(Cores personalizadas)'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.btnPrimaryTheme}
                onClick={() => setShowThemeGalleryModal(true)}
                title="Abrir a galeria de temas para explorar e selecionar uma paleta"
              >
                <BookOpen size={15} />
                Biblioteca de Temas
              </button>
            </div>
          </div>

          {/* Dicas contextuais informando o que o botão de salvar fará */}
          {baseTheme && !baseTheme.is_predefined && isBaseThemeModified && (
            <div style={{ margin: '10px 0 20px 0', fontSize: '0.82rem', color: '#92400e', background: '#fffbeb', padding: '8px 14px', borderRadius: 6, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span>
                ✏️ Você está editando o tema personalizado <strong>"{baseTheme.name}"</strong>. Ao clicar em <em>Salvar alterações</em>, o modelo e a Landing Page serão atualizados juntos.
              </span>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b45309',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  padding: 0,
                  fontFamily: 'inherit',
                }}
                onClick={() => {
                  const maxCustom = themeQuota?.max_custom ?? 6;
                  const customCount = themeQuota ? themeQuota.custom_count : themes.filter(t => !t.is_predefined).length;
                  if (customCount >= maxCustom) {
                    setSaveError(`Limite máximo de ${maxCustom} temas personalizados atingido. Exclua um tema na biblioteca para liberar espaço.`);
                    return;
                  }
                  setIsForkingPredefined(false);
                  setNewThemeName(`${baseTheme.name} (Cópia)`);
                  setNewThemeDesc('');
                  setSaveNewError(null);
                  setShowSaveCurrentModal(true);
                }}
              >
                Salvar como uma cópia separada
              </button>
            </div>
          )}


          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* 1 - Cores de Fundo */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              1. Cores de Fundo
            </h3>
            <div className={styles.row2}>
              <Field
                label="BACKGROUND 1"
                tooltip="Aplica-se às seções: Navbar, Hero (inclui o fundo do botão vazado 'Conheça o Escritório'), Diferenciais, Artigos e Rodapé"
              >
                <ColorPicker
                  value={data.colorBgPrimary || '#232C43'}
                  onChange={v => updateColor('colorBgPrimary', v)}
                />
              </Field>

              <Field
                label="BACKGROUND 2"
                tooltip="Aplica-se às seções: Escritório, Áreas e Contato"
              >
                <ColorPicker
                  value={data.colorBgSecondary || '#F5F3EF'}
                  onChange={v => updateColor('colorBgSecondary', v)}
                />
              </Field>
            </div>

            <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
              <Field
                label="BACKGROUND 3"
                tooltip="Aplica-se à seção: Sobre o Advogado"
              >
                <ColorPicker
                  value={data.colorBgSobre || '#FFFFFF'}
                  onChange={v => updateColor('colorBgSobre', v)}
                />
              </Field>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* 2 - Cores dos Botões */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              2. Cores dos Botões
            </h3>
            <div className={styles.row2}>
              <Field
                label="FUNDO DOS BOTÕES"
                tooltip="Aplica-se à cor de fundo dos botões principais: 'Agendar Consulta', 'Fale Conosco', 'Falar no WhatsApp' e 'Enviar Mensagem' (o botão 'Conheça o Escritório' possui estilo vazado sobre o Background 1)"
              >
                <ColorPicker
                  value={data.colorButtons || '#661C16'}
                  onChange={v => updateColor('colorButtons', v)}
                />
              </Field>

              <Field
                label="HOVER DOS BOTÕES"
                tooltip="Aplica-se à cor de fundo ao passar o mouse (hover) sobre os botões principais"
              >
                <ColorPicker
                  value={data.colorButtonsHover || '#A52020'}
                  onChange={v => updateColor('colorButtonsHover', v)}
                />
              </Field>
            </div>

            <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
              <Field
                label="TEXTO DOS BOTÕES"
                tooltip="Aplica-se à cor do texto/fonte interno dos botões principais"
              >
                <ColorPicker
                  value={data.colorButtonsText || '#FFFFFF'}
                  onChange={v => updateColor('colorButtonsText', v)}
                />
              </Field>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* 3 - Cores das Fontes */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
              3. Cores das Fontes
            </h3>
            <div className={styles.row2}>
              <Field
                label="TÍTULOS 1"
                tooltip="Aplica-se aos títulos das seções: Hero, Diferenciais, Artigos e Rodapé"
              >
                <ColorPicker
                  value={data.colorTitlePrimary || '#FFFFFF'}
                  onChange={v => updateColor('colorTitlePrimary', v)}
                />
              </Field>

              <Field
                label="TÍTULOS 2"
                tooltip="Aplica-se aos títulos das seções: Escritório, Áreas, Contato e Sobre"
              >
                <ColorPicker
                  value={data.colorTitleSecondary || '#232C43'}
                  onChange={v => updateColor('colorTitleSecondary', v)}
                />
              </Field>
            </div>

            <div className={styles.row2} style={{ marginTop: 16 }}>
              <Field
                label="TEXTOS 1"
                tooltip="Aplica-se aos parágrafos (<p>) das seções: Hero, Diferenciais, Artigos e Rodapé"
              >
                <ColorPicker
                  value={data.colorTextPrimary || '#FFFFFF'}
                  onChange={v => updateColor('colorTextPrimary', v)}
                />
              </Field>

              <Field
                label="TEXTOS 2"
                tooltip="Aplica-se aos parágrafos (<p>) das seções: Escritório, Áreas, Contato e Sobre"
              >
                <ColorPicker
                  value={data.colorTextSecondary || '#6B7280'}
                  onChange={v => updateColor('colorTextSecondary', v)}
                />
              </Field>
            </div>

            <div className={styles.row2} style={{ marginTop: 16 }}>
              <Field
                label="LINKS 1"
                tooltip="Aplica-se aos links (<a>) das seções: Navbar, Artigos ('Leia o artigo') e Rodapé"
              >
                <ColorPicker
                  value={data.colorLinkPrimary || '#FFFFFF'}
                  onChange={v => updateColor('colorLinkPrimary', v)}
                />
              </Field>

              <Field
                label="LINKS 2"
                tooltip="Aplica-se aos links textuais (<a>): 'Saiba Mais →' (Escritório e Sobre) e link de Termos (Contato)"
              >
                <ColorPicker
                  value={data.colorLinkSecondary || '#661C16'}
                  onChange={v => updateColor('colorLinkSecondary', v)}
                />
              </Field>
            </div>
          </div>
        </div>
        </div>
      </SectionCard>

      {/* Modal da Galeria de Temas da Landing Page */}
      <ThemeGallery
        isOpen={showThemeGalleryModal}
        onClose={() => setShowThemeGalleryModal(false)}
        themes={themes}
        onRefreshThemes={fetchThemes}
        onSelectTheme={handleSelectFromLibrary}
        currentLandingColors={data}
        activeThemeId={data.themeId ?? matchedTheme?.id ?? baseTheme?.id ?? null}
      />

      {/* Modal: Salvar Cores Atuais na Biblioteca */}
      {showSaveCurrentModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowSaveCurrentModal(false); setIsForkingPredefined(false); }}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {isForkingPredefined ? 'Novo Tema Personalizado' : 'Salvar Tema na Biblioteca'}
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setShowSaveCurrentModal(false); setIsForkingPredefined(false); }}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                {isForkingPredefined ? (
                  <>
                    Você personalizou as cores a partir do tema de fábrica <strong>"{baseTheme?.name || 'pré-definido'}"</strong>.
                    Informe um nome para criar o novo tema personalizado:
                  </>
                ) : (
                  'As 12 cores atualmente configuradas na Landing Page serão salvas como um novo tema personalizado na sua biblioteca.'
                )}
              </p>

              <div className={styles.palettePreviewMini}>
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorBgPrimary || '#232C43' }} title="Background 1" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorBgSecondary || '#F5F3EF' }} title="Background 2" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorBgSobre || '#FFFFFF' }} title="Background Sobre" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorButtons || '#661C16' }} title="Botões" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorButtonsHover || '#A52020' }} title="Hover Botões" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorButtonsText || '#FFFFFF' }} title="Texto Botões" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorTitlePrimary || '#FFFFFF' }} title="Títulos 1" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorTitleSecondary || '#232C43' }} title="Títulos 2" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorTextPrimary || '#FFFFFF' }} title="Textos 1" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorTextSecondary || '#6B7280' }} title="Textos 2" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorLinkPrimary || '#FFFFFF' }} title="Links 1" />
                <span className={styles.palettePreviewMiniSegment} style={{ background: data.colorLinkSecondary || '#661C16' }} title="Links 2" />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Nome do Tema *</label>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="Ex: Corporativo Noturno, Minimalista Ouro..."
                  value={newThemeName}
                  onChange={e => setNewThemeName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Descrição (Opcional)</label>
                <textarea
                  className={styles.textareaInput}
                  rows={2}
                  placeholder="Breve descrição da identidade deste tema..."
                  value={newThemeDesc}
                  onChange={e => setNewThemeDesc(e.target.value)}
                />
              </div>

              {saveNewError && (
                <p className={styles.modalError}>{saveNewError}</p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => { setShowSaveCurrentModal(false); setIsForkingPredefined(false); }}
                disabled={savingNewTheme}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnConfirm}
                onClick={handleSaveCurrentAsTheme}
                disabled={savingNewTheme || !newThemeName.trim()}
              >
                {savingNewTheme ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    {isForkingPredefined ? 'Salvar alterações' : 'Salvar na Biblioteca'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div data-pending-changes={isDirty ? "true" : "false"} className={`${styles.bottomBar} ${isDirty || saveError ? styles.bottomBarVisible : ''}`}>
        {saveError && (
          <span role="alert" className={styles.bottomError}>{saveError}</span>
        )}
        {!saveError && (
          <span className={styles.bottomMsg}>
            <span className={styles.dot} /> Alterações não salvas detectadas...
          </span>
        )}
        <div className={styles.bottomActions}>
          <button className={styles.btnDiscard} onClick={discard} disabled={saving}>
            <X size={15} /> Descartar
          </button>
          <button className={styles.btnSave} onClick={save} disabled={saving || !isDirty || (branding.dirty && !branding.ready)}>
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
              : <><Check size={15} /> Salvar alterações</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
