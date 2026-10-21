import { X, Check, Loader2 } from 'lucide-react';
import type { LandingPageData } from '../types';
import styles from '../LandingPage.module.css';

export interface SaveThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isForkingPredefined: boolean;
  baseThemeName?: string;
  colors: LandingPageData;
  themeName: string;
  onThemeNameChange: (val: string) => void;
  themeDesc: string;
  onThemeDescChange: (val: string) => void;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
}

export default function SaveThemeModal({
  isOpen,
  onClose,
  isForkingPredefined,
  baseThemeName,
  colors,
  themeName,
  onThemeNameChange,
  themeDesc,
  onThemeDescChange,
  saving,
  error,
  onConfirm,
}: SaveThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isForkingPredefined ? 'Novo Tema Personalizado' : 'Salvar Tema na Biblioteca'}
          </h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            {isForkingPredefined ? (
              <>
                Você personalizou as cores a partir de um tema pré-definido <strong>"{baseThemeName || 'pré-definido'}"</strong>.
                Informe um nome para criar o novo tema personalizado:
              </>
            ) : (
              'As 12 cores atualmente configuradas na Landing Page serão salvas como um novo tema personalizado na sua biblioteca.'
            )}
          </p>

          <div className={styles.palettePreviewMini}>
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorBgPrimary || '#232C43' }} title="Background 1" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorBgSecondary || '#F5F3EF' }} title="Background 2" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorBgSobre || '#FFFFFF' }} title="Background Sobre" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorButtons || '#661C16' }} title="Botões" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorButtonsHover || '#A52020' }} title="Hover Botões" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorButtonsText || '#FFFFFF' }} title="Texto Botões" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorTitlePrimary || '#FFFFFF' }} title="Títulos 1" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorTitleSecondary || '#232C43' }} title="Títulos 2" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorTextPrimary || '#FFFFFF' }} title="Textos 1" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorTextSecondary || '#6B7280' }} title="Textos 2" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorLinkPrimary || '#FFFFFF' }} title="Links 1" />
            <span className={styles.palettePreviewMiniSegment} style={{ background: colors.colorLinkSecondary || '#661C16' }} title="Links 2" />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Nome do Tema *</label>
            <input
              type="text"
              className={styles.textInput}
              placeholder="Ex: Corporativo Noturno, Minimalista Ouro..."
              value={themeName}
              onChange={e => onThemeNameChange(e.target.value)}
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
              value={themeDesc}
              onChange={e => onThemeDescChange(e.target.value)}
            />
          </div>

          {error && <p className={styles.modalError}>{error}</p>}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnConfirm}
            onClick={onConfirm}
            disabled={saving || !themeName.trim()}
          >
            {saving ? (
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
  );
}
