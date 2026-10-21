import { Palette, BookOpen } from 'lucide-react';
import type { LandingPageData } from '../types';
import type { PersonalizacaoThemesController } from '../hooks/usePersonalizacaoThemes';
import type { OfficeConfigAPI } from '../../../../services/officeConfigService';
import SectionCard from './SectionCard';
import Field from './Field';
import LandingPreview from './LandingPreview';
import SaveThemeModal from './SaveThemeModal';
import ColorPicker from '../../../../components/sistema/shared/ColorPicker';
import ThemeGallery from '../../../../components/sistema/shared/ThemeGallery';
import styles from '../LandingPage.module.css';

export interface CoresSectionProps {
  data: LandingPageData;
  themes: PersonalizacaoThemesController;
  brandingSave: () => Promise<void>;
  applyConfig?: (cfg: OfficeConfigAPI) => void;
  onQuotaExceeded?: (msg: string) => void;
}

export default function CoresSection({
  data,
  themes,
  brandingSave,
  applyConfig,
  onQuotaExceeded,
}: CoresSectionProps) {
  const {
    baseTheme,
    matchedTheme,
    isBaseThemeModified,
    updateColor,
    restoreDefaultColors,
    handleSelectFromLibrary,
    fetchThemes,
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
    openCopyModal,
    closeSaveModal,
    handleSaveCurrentAsTheme,
    themeQuota,
  } = themes;

  return (
    <>
      <SectionCard icon={<Palette size={20} />} title="Cores da Landing Page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Preview em tempo real</h3>
            <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: 14 }}>Preview com os componentes reais do site. Passe o mouse sobre os botões para conferir o hover.</p>
            <LandingPreview data={data} />
          </div>

          {/* Botão para restaurar cores originais */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--navy)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              onClick={restoreDefaultColors}
            >
              ↺ Restaurar Cores Padrão
            </button>
          </div>

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
                    {baseTheme ? `${baseTheme.name} (modificado)` : '(Cores personalizadas)'}
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
                    const customCount = themeQuota ? themeQuota.custom_count : themes.themes.filter(t => !t.is_predefined).length;
                    if (customCount >= maxCustom) {
                      onQuotaExceeded?.(`Limite máximo de ${maxCustom} temas personalizados atingido. Exclua um tema na biblioteca para liberar espaço.`);
                      return;
                    }
                    openCopyModal();
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
        </div>
      </SectionCard>

      {/* Modal da Galeria de Temas */}
      <ThemeGallery
        isOpen={showThemeGalleryModal}
        onClose={() => setShowThemeGalleryModal(false)}
        themes={themes.themes}
        onRefreshThemes={fetchThemes}
        onSelectTheme={handleSelectFromLibrary}
        currentLandingColors={data}
        activeThemeId={data.themeId ?? matchedTheme?.id ?? baseTheme?.id ?? null}
        quota={themeQuota}
      />

      {/* Modal: Salvar Cores Atuais na Biblioteca */}
      <SaveThemeModal
        isOpen={showSaveCurrentModal}
        onClose={closeSaveModal}
        isForkingPredefined={isForkingPredefined}
        baseThemeName={baseTheme?.name}
        colors={data}
        themeName={newThemeName}
        onThemeNameChange={setNewThemeName}
        themeDesc={newThemeDesc}
        onThemeDescChange={setNewThemeDesc}
        saving={savingNewTheme}
        error={saveNewError}
        onConfirm={() => handleSaveCurrentAsTheme(brandingSave, applyConfig)}
      />
    </>
  );
}
