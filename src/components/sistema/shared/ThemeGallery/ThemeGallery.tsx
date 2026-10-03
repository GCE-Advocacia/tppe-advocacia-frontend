import { useState, useEffect, useCallback } from 'react';
import {
  Palette, Plus, Pencil, Trash2, Check, X, Loader2, Copy, ArrowRight
} from 'lucide-react';
import type { LandingPageData, LandingPageTheme, ThemeCreatePayload } from '../../../../pages/sistema/LandingPage/types';
import {
  createTheme,
  updateTheme,
  deleteTheme,
  getThemeQuota,
  type ThemeQuota
} from '../../../../services/officeConfigService';
import styles from './ThemeGallery.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  themes: LandingPageTheme[];
  onRefreshThemes: () => Promise<void>;
  onSelectTheme: (theme: LandingPageTheme) => void;
  currentLandingColors: LandingPageData;
  activeThemeId?: number | null;
}

type ModalMode = 'create' | 'edit' | 'duplicate' | null;

interface ThemeFormState {
  id?: number;
  name: string;
  description: string;
  color: string;
  color_bg_primary: string;
  color_bg_secondary: string;
  color_bg_sobre: string;
  color_buttons: string;
  color_buttons_hover: string;
  color_buttons_text: string;
  color_title_primary: string;
  color_title_secondary: string;
  color_text_primary: string;
  color_text_secondary: string;
  color_link_primary: string;
  color_link_secondary: string;
}

const DEFAULT_FORM_STATE: ThemeFormState = {
  name: '',
  description: '',
  color: '#232C43',
  color_bg_primary: '#232C43',
  color_bg_secondary: '#F5F3EF',
  color_bg_sobre: '#FFFFFF',
  color_buttons: '#661C16',
  color_buttons_hover: '#A52020',
  color_buttons_text: '#FFFFFF',
  color_title_primary: '#FFFFFF',
  color_title_secondary: '#232C43',
  color_text_primary: '#FFFFFF',
  color_text_secondary: '#6B7280',
  color_link_primary: '#FFFFFF',
  color_link_secondary: '#661C16',
};

export default function ThemeGallery({
  isOpen,
  onClose,
  themes,
  onRefreshThemes,
  onSelectTheme,
  currentLandingColors,
  activeThemeId,
}: Props) {
  if (!isOpen) return null;

  // Modal de Criação / Edição de Tema
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [formData, setFormData] = useState<ThemeFormState>(DEFAULT_FORM_STATE);
  const [savingTheme, setSavingTheme] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal de Exclusão
  const [themeToDelete, setThemeToDelete] = useState<LandingPageTheme | null>(null);
  const [deletingTheme, setDeletingTheme] = useState(false);

  // Cota dinâmica fornecida pelo backend
  const [quota, setQuota] = useState<ThemeQuota | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const q = await getThemeQuota();
      setQuota(q);
    } catch {
      // fallback silencioso
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchQuota();
    }
  }, [isOpen, fetchQuota, themes]);

  const customCount = quota ? quota.custom_count : themes.filter(t => !t.is_predefined).length;
  const maxCustom = quota?.max_custom ?? 6;
  const maxTotal = quota?.max_total ?? 10;
  const isLimitReached = quota
    ? quota.is_limit_reached
    : customCount >= maxCustom || themes.length >= maxTotal;

  function isThemeActive(theme: LandingPageTheme) {
    if (activeThemeId !== undefined) {
      return activeThemeId !== null && theme.id === activeThemeId;
    }
    return (
      theme.color_bg_primary.toLowerCase() === (currentLandingColors.colorBgPrimary || '').toLowerCase() &&
      theme.color_bg_secondary.toLowerCase() === (currentLandingColors.colorBgSecondary || '').toLowerCase() &&
      theme.color_bg_sobre.toLowerCase() === (currentLandingColors.colorBgSobre || '').toLowerCase() &&
      theme.color_buttons.toLowerCase() === (currentLandingColors.colorButtons || '').toLowerCase() &&
      theme.color_buttons_hover.toLowerCase() === (currentLandingColors.colorButtonsHover || '').toLowerCase() &&
      theme.color_buttons_text.toLowerCase() === (currentLandingColors.colorButtonsText || '').toLowerCase() &&
      theme.color_title_primary.toLowerCase() === (currentLandingColors.colorTitlePrimary || '').toLowerCase() &&
      theme.color_title_secondary.toLowerCase() === (currentLandingColors.colorTitleSecondary || '').toLowerCase() &&
      theme.color_text_primary.toLowerCase() === (currentLandingColors.colorTextPrimary || '').toLowerCase() &&
      theme.color_text_secondary.toLowerCase() === (currentLandingColors.colorTextSecondary || '').toLowerCase() &&
      theme.color_link_primary.toLowerCase() === (currentLandingColors.colorLinkPrimary || '').toLowerCase() &&
      theme.color_link_secondary.toLowerCase() === (currentLandingColors.colorLinkSecondary || '').toLowerCase()
    );
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalMode && !themeToDelete) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, modalMode, themeToDelete]);

  function openDuplicateModal(baseTheme: LandingPageTheme) {
    if (isLimitReached) return;
    setModalError(null);
    setFormData({
      name: `Cópia de ${baseTheme.name}`,
      description: baseTheme.description || '',
      color: baseTheme.color,
      color_bg_primary: baseTheme.color_bg_primary,
      color_bg_secondary: baseTheme.color_bg_secondary,
      color_bg_sobre: baseTheme.color_bg_sobre,
      color_buttons: baseTheme.color_buttons,
      color_buttons_hover: baseTheme.color_buttons_hover,
      color_buttons_text: baseTheme.color_buttons_text,
      color_title_primary: baseTheme.color_title_primary,
      color_title_secondary: baseTheme.color_title_secondary,
      color_text_primary: baseTheme.color_text_primary,
      color_text_secondary: baseTheme.color_text_secondary,
      color_link_primary: baseTheme.color_link_primary,
      color_link_secondary: baseTheme.color_link_secondary,
    });
    setModalMode('duplicate');
  }

  function openCreateFromLandingModal() {
    if (isLimitReached) return;
    setModalError(null);
    setFormData({
      ...DEFAULT_FORM_STATE,
      color: currentLandingColors.color || DEFAULT_FORM_STATE.color,
      color_bg_primary: currentLandingColors.colorBgPrimary || DEFAULT_FORM_STATE.color_bg_primary,
      color_bg_secondary: currentLandingColors.colorBgSecondary || DEFAULT_FORM_STATE.color_bg_secondary,
      color_bg_sobre: currentLandingColors.colorBgSobre || DEFAULT_FORM_STATE.color_bg_sobre,
      color_buttons: currentLandingColors.colorButtons || DEFAULT_FORM_STATE.color_buttons,
      color_buttons_hover: currentLandingColors.colorButtonsHover || DEFAULT_FORM_STATE.color_buttons_hover,
      color_buttons_text: currentLandingColors.colorButtonsText || DEFAULT_FORM_STATE.color_buttons_text,
      color_title_primary: currentLandingColors.colorTitlePrimary || DEFAULT_FORM_STATE.color_title_primary,
      color_title_secondary: currentLandingColors.colorTitleSecondary || DEFAULT_FORM_STATE.color_title_secondary,
      color_text_primary: currentLandingColors.colorTextPrimary || DEFAULT_FORM_STATE.color_text_primary,
      color_text_secondary: currentLandingColors.colorTextSecondary || DEFAULT_FORM_STATE.color_text_secondary,
      color_link_primary: currentLandingColors.colorLinkPrimary || DEFAULT_FORM_STATE.color_link_primary,
      color_link_secondary: currentLandingColors.colorLinkSecondary || DEFAULT_FORM_STATE.color_link_secondary,
    });
    setModalMode('create');
  }

  function openEditModal(theme: LandingPageTheme) {
    setModalError(null);
    setFormData({
      id: theme.id,
      name: theme.name,
      description: theme.description || '',
      color: theme.color,
      color_bg_primary: theme.color_bg_primary,
      color_bg_secondary: theme.color_bg_secondary,
      color_bg_sobre: theme.color_bg_sobre,
      color_buttons: theme.color_buttons,
      color_buttons_hover: theme.color_buttons_hover,
      color_buttons_text: theme.color_buttons_text,
      color_title_primary: theme.color_title_primary,
      color_title_secondary: theme.color_title_secondary,
      color_text_primary: theme.color_text_primary,
      color_text_secondary: theme.color_text_secondary,
      color_link_primary: theme.color_link_primary,
      color_link_secondary: theme.color_link_secondary,
    });
    setModalMode('edit');
  }

  async function handleSaveTheme() {
    if (!formData.name.trim()) {
      setModalError('Informe um nome para o tema.');
      return;
    }
    setSavingTheme(true);
    setModalError(null);
    try {
      if (modalMode === 'duplicate' || modalMode === 'create') {
        const payload: ThemeCreatePayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color_bg_primary,
          color_bg_primary: formData.color_bg_primary,
          color_bg_secondary: formData.color_bg_secondary,
          color_bg_sobre: formData.color_bg_sobre,
          color_buttons: formData.color_buttons,
          color_buttons_hover: formData.color_buttons_hover,
          color_buttons_text: formData.color_buttons_text,
          color_title_primary: formData.color_title_primary,
          color_title_secondary: formData.color_title_secondary,
          color_text_primary: formData.color_text_primary,
          color_text_secondary: formData.color_text_secondary,
          color_link_primary: formData.color_link_primary,
          color_link_secondary: formData.color_link_secondary,
        };
        await createTheme(payload);
      } else if (modalMode === 'edit' && formData.id) {
        await updateTheme(formData.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color_bg_primary,
          color_bg_primary: formData.color_bg_primary,
          color_bg_secondary: formData.color_bg_secondary,
          color_bg_sobre: formData.color_bg_sobre,
          color_buttons: formData.color_buttons,
          color_buttons_hover: formData.color_buttons_hover,
          color_buttons_text: formData.color_buttons_text,
          color_title_primary: formData.color_title_primary,
          color_title_secondary: formData.color_title_secondary,
          color_text_primary: formData.color_text_primary,
          color_text_secondary: formData.color_text_secondary,
          color_link_primary: formData.color_link_primary,
          color_link_secondary: formData.color_link_secondary,
        });
      }
      await onRefreshThemes();
      await fetchQuota();
      setModalMode(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Erro ao salvar tema.');
    } finally {
      setSavingTheme(false);
    }
  }

  async function handleDeleteTheme() {
    if (!themeToDelete) return;
    setDeletingTheme(true);
    try {
      await deleteTheme(themeToDelete.id);
      await onRefreshThemes();
      await fetchQuota();
      setThemeToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir tema.');
    } finally {
      setDeletingTheme(false);
    }
  }

  return (
    <div
      className={styles.galleryModalOverlay}
      onMouseDown={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.galleryModalBox}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Botão de Fechar no Canto Superior Direito */}
        <button
          type="button"
          className={styles.closeModalBtn}
          onClick={onClose}
          title="Fechar biblioteca de temas"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <Palette size={22} color="var(--navy, #232C43)" />
            <div>
              <h3 className={styles.title}>Biblioteca de Temas</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Clique em um tema para selecioná-lo e carregar suas cores no formulário da Landing Page.
              </p>
            </div>
            <span className={`${styles.quotaBadge} ${isLimitReached ? styles.quotaBadgeFull : ''}`}>
              {customCount}/{maxCustom} personalizados (Total: {themes.length}/{maxTotal})
            </span>
          </div>

          <button
            type="button"
            className={styles.btnNewTheme}
            disabled={isLimitReached}
            title={
              isLimitReached
                ? `Limite máximo atingido (${maxCustom} personalizados / ${maxTotal} total).`
                : 'Salvar combinação atual como novo tema'
            }
            onClick={() => openCreateFromLandingModal()}
          >
            <Plus size={16} />
            Criar Novo Tema
          </button>
        </div>

        <div className={styles.grid}>
          {themes.map(theme => {
            const active = isThemeActive(theme);
            return (
              <div
                key={theme.id}
                className={`${styles.card} ${active ? styles.cardActive : ''}`}
                onClick={() => onSelectTheme(theme)}
                title="Clique para selecionar este tema na Landing Page"
              >
                <div className={styles.cardHeader}>
                  <div>
                    <h4 className={styles.cardName}>{theme.name}</h4>
                    {theme.description && <p className={styles.cardDesc}>{theme.description}</p>}
                  </div>
                  <div className={styles.badgeGroup}>
                    <span
                      className={`${styles.typeBadge} ${
                        theme.is_predefined ? styles.badgePredefined : styles.badgeCustom
                      }`}
                    >
                      {theme.is_predefined ? 'Padrão' : 'Personalizado'}
                    </span>
                  </div>
                </div>

                {/* Ribbon contínuo de 12 cores */}
                <div className={styles.swatchStrip} title="Paleta completa de 12 cores">
                  <span style={{ backgroundColor: theme.color_bg_primary }} title="Background 1" />
                  <span style={{ backgroundColor: theme.color_bg_secondary }} title="Background 2" />
                  <span style={{ backgroundColor: theme.color_bg_sobre }} title="Background Sobre" />
                  <span style={{ backgroundColor: theme.color_buttons }} title="Botões" />
                  <span style={{ backgroundColor: theme.color_buttons_hover }} title="Hover Botões" />
                  <span style={{ backgroundColor: theme.color_buttons_text }} title="Texto Botões" />
                  <span style={{ backgroundColor: theme.color_title_primary }} title="Títulos 1" />
                  <span style={{ backgroundColor: theme.color_title_secondary }} title="Títulos 2" />
                  <span style={{ backgroundColor: theme.color_text_primary }} title="Textos 1" />
                  <span style={{ backgroundColor: theme.color_text_secondary }} title="Textos 2" />
                  <span style={{ backgroundColor: theme.color_link_primary }} title="Links 1" />
                  <span style={{ backgroundColor: theme.color_link_secondary }} title="Links 2" />
                </div>

                {/* Card Actions */}
                <div className={styles.cardActions}>
                  {active ? (
                    <button
                      type="button"
                      className={styles.btnSelected}
                      disabled
                      title="Este tema já é o que está ativo no formulário"
                    >
                      <Check size={14} />
                      Tema Atual
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnSelectTheme}
                      title="Carrega as cores deste tema no formulário da Landing Page"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTheme(theme);
                      }}
                    >
                      <Check size={14} />
                      Selecionar Tema
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.btnIcon}
                    title="Duplicar tema (copiar cores e definir novo nome/descrição)"
                    disabled={isLimitReached}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDuplicateModal(theme);
                    }}
                  >
                    <Copy size={14} />
                  </button>

                  {!theme.is_predefined && (
                    <>
                      <button
                        type="button"
                        className={styles.btnIcon}
                        title="Editar informações e paleta deste tema"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(theme);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                        title="Excluir tema personalizado"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThemeToDelete(theme);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      {/* Modal: Duplicar / Editar / Salvar Tema (Apenas Nome e Descrição) */}
      {modalMode && (
        <div className={styles.modalOverlay} onMouseDown={() => setModalMode(null)}>
          <div className={styles.modalBox} onMouseDown={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalMode === 'duplicate' && 'Duplicar Tema'}
                {modalMode === 'edit' && 'Editar Tema'}
                {modalMode === 'create' && 'Salvar Novo Tema na Biblioteca'}
              </h3>
              <button className={styles.modalClose} onClick={() => setModalMode(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                {modalMode === 'duplicate' &&
                  'Crie uma cópia deste tema na sua biblioteca mantendo exatamente as mesmas cores. Você pode escolher um novo nome e descrição.'}
                {modalMode === 'edit' &&
                  'Altere o nome ou descrição deste tema personalizado. Para alterar as cores, utilize os seletores na página de configurações.'}
                {modalMode === 'create' &&
                  'As 12 cores atualmente configuradas na Landing Page serão salvas como um novo tema personalizado.'}
              </p>

              {/* Preview visual das 12 cores do tema copiado/editado */}
              <div className={styles.swatchStrip} title="Paleta de cores deste tema">
                <span style={{ backgroundColor: formData.color_bg_primary }} title="Background 1" />
                <span style={{ backgroundColor: formData.color_bg_secondary }} title="Background 2" />
                <span style={{ backgroundColor: formData.color_bg_sobre }} title="Background Sobre" />
                <span style={{ backgroundColor: formData.color_buttons }} title="Botões" />
                <span style={{ backgroundColor: formData.color_buttons_hover }} title="Hover Botões" />
                <span style={{ backgroundColor: formData.color_buttons_text }} title="Texto Botões" />
                <span style={{ backgroundColor: formData.color_title_primary }} title="Títulos 1" />
                <span style={{ backgroundColor: formData.color_title_secondary }} title="Títulos 2" />
                <span style={{ backgroundColor: formData.color_text_primary }} title="Textos 1" />
                <span style={{ backgroundColor: formData.color_text_secondary }} title="Textos 2" />
                <span style={{ backgroundColor: formData.color_link_primary }} title="Links 1" />
                <span style={{ backgroundColor: formData.color_link_secondary }} title="Links 2" />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Nome do Tema *</label>
                <input
                  className={styles.input}
                  placeholder="Ex: Cópia de Clássico Navy"
                  maxLength={100}
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Descrição (Opcional)</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Descreva a proposta deste tema..."
                  rows={2}
                  maxLength={255}
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {modalError && <p className={styles.modalError}>{modalError}</p>}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnCancel}
                disabled={savingTheme}
                onClick={() => setModalMode(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnConfirm}
                disabled={savingTheme || !formData.name.trim()}
                onClick={handleSaveTheme}
              >
                {savingTheme ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                {modalMode === 'duplicate' && 'Duplicar Tema'}
                {modalMode === 'edit' && 'Salvar Alterações'}
                {modalMode === 'create' && 'Salvar Tema'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {themeToDelete && (
        <div className={styles.modalOverlay} onMouseDown={() => setThemeToDelete(null)}>
          <div className={styles.modalBox} onMouseDown={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Excluir Tema</h3>
              <button className={styles.modalClose} onClick={() => setThemeToDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                Tem certeza que deseja excluir o tema <strong>{themeToDelete.name}</strong> da biblioteca?
              </p>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Esta ação liberará 1 espaço na sua cota de temas personalizados. Não afetará as cores atualmente salvas na sua Landing Page.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnCancel}
                disabled={deletingTheme}
                onClick={() => setThemeToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnDangerConfirm}
                disabled={deletingTheme}
                onClick={handleDeleteTheme}
              >
                {deletingTheme ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
