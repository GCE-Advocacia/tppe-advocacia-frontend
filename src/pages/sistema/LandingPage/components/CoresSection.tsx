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
    baseTheme, matchedTheme, isBaseThemeModified, updateColor, updateSystemButtons,
    restoreDefaultColors, handleSelectFromLibrary, fetchThemes,
    showThemeGalleryModal, setShowThemeGalleryModal,
    showSaveCurrentModal, isForkingPredefined,
    newThemeName, setNewThemeName, newThemeDesc, setNewThemeDesc,
    savingNewTheme, saveNewError, openCopyModal, closeSaveModal,
    handleSaveCurrentAsTheme, themeQuota,
  } = themes;

  return (
    <>
      <SectionCard icon={<Palette size={20} />} title="Paleta de Cores e Temas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Preview em tempo real</h3>
            <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: 14 }}>Preview com os componentes reais do site. Passe o mouse sobre os botões para conferir o hover.</p>
            <LandingPreview data={data} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={{
                background: 'none', border: '1px solid #d1d5db', borderRadius: '6px',
                padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600,
                color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
              onClick={restoreDefaultColors}
            >
              ↺ Restaurar Cores Padrão
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className={styles.themeSelectorBar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>Tema Base:</span>
                {matchedTheme ? (
                  <span className={styles.themeActiveBadge}>
                    <Palette size={14} />
                    {matchedTheme.name}
                    {matchedTheme.is_predefined && <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: 4 }}>• Pré-definido</span>}
                  </span>
                ) : baseTheme && !baseTheme.is_predefined ? (
                  <span className={styles.themeActiveBadge} style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Alterações pendentes.">
                    <Palette size={14} />
                    {baseTheme.name}
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, marginLeft: 4 }}>• em edição</span>
                  </span>
                ) : (
                  <span className={styles.themeCustomBadge}>
                    {baseTheme ? `${baseTheme.name} (modificado)` : '(Cores personalizadas)'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className={styles.btnPrimaryTheme} onClick={() => setShowThemeGalleryModal(true)}>
                  <BookOpen size={15} /> Biblioteca de Temas
                </button>
              </div>
            </div>

            {baseTheme && !baseTheme.is_predefined && isBaseThemeModified && (
              <div style={{ margin: '10px 0 20px 0', fontSize: '0.82rem', color: '#92400e', background: '#fffbeb', padding: '8px 14px', borderRadius: 6, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#b45309', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0 }}
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
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>1. Cores de Fundo</h3>
                <div className={styles.row2}>
                  <Field label="BACKGROUND 1" tooltip="Aplica-se à Navbar, Hero, Diferenciais, Artigos, Rodapé e à Barra Lateral (Sidebar) do sistema.">
                    <ColorPicker value={data.colorBgPrimary || '#232C43'} onChange={v => updateColor('colorBgPrimary', v)} />
                  </Field>
                  <Field label="BACKGROUND 2" tooltip="Aplica-se a Escritório, Áreas, Contato e ao fundo do sistema no modo imersivo.">
                    <ColorPicker value={data.colorBgSecondary || '#F5F3EF'} onChange={v => updateColor('colorBgSecondary', v)} />
                  </Field>
                </div>
                <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
                  <Field label="BACKGROUND 3" tooltip="Aplica-se ao Sobre o Advogado e aos cards/painéis do sistema no modo imersivo.">
                    <ColorPicker value={data.colorBgSobre || '#FFFFFF'} onChange={v => updateColor('colorBgSobre', v)} />
                  </Field>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

              {/* 2 - Cores dos Botões */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>2. Cores dos Botões</h3>
                <div style={{ marginBottom: 16 }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={data.systemUsesLandingButtons ?? true}
                      onChange={e => {
                        const checked = e.target.checked;
                        if (!checked) {
                          updateSystemButtons({
                            systemUsesLandingButtons: false,
                            colorButtonsSystem: data.colorButtonsSystem || data.colorButtons || '#661C16',
                            colorButtonsSystemHover: data.colorButtonsSystemHover || data.colorButtonsHover || '#A52020',
                            colorButtonsSystemText: data.colorButtonsSystemText || data.colorButtonsText || '#FFFFFF',
                          });
                        } else {
                          updateSystemButtons({ systemUsesLandingButtons: true });
                        }
                      }}
                    />
                    <span>Usar as mesmas cores de botões no sistema</span>
                  </label>
                </div>

                <div className={styles.row2}>
                  <Field label="FUNDO DOS BOTÕES" tooltip="Aplica-se à cor de fundo dos botões da vitrine pública (e do sistema quando vinculado).">
                    <ColorPicker value={data.colorButtons || '#661C16'} onChange={v => updateColor('colorButtons', v)} />
                  </Field>
                  <Field label="HOVER DOS BOTÕES" tooltip="Aplica-se ao hover dos botões da vitrine pública (e do sistema quando vinculado).">
                    <ColorPicker value={data.colorButtonsHover || '#A52020'} onChange={v => updateColor('colorButtonsHover', v)} />
                  </Field>
                </div>
                <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
                  <Field label="TEXTO DOS BOTÕES" tooltip="Aplica-se ao texto dos botões da vitrine pública (e do sistema quando vinculado).">
                    <ColorPicker value={data.colorButtonsText || '#FFFFFF'} onChange={v => updateColor('colorButtonsText', v)} />
                  </Field>
                </div>

                {!(data.systemUsesLandingButtons ?? true) && (
                  <div className={styles.systemButtonsBox}>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>
                        Cores dos Botões no Sistema
                      </h4>
                      <p style={{ color: 'var(--gray)', fontSize: '.8rem', margin: 0 }}>
                        Personalize os botões das páginas internas e da tela de login de forma independente da vitrine.
                      </p>
                    </div>
                    <div className={styles.row2}>
                      <Field label="FUNDO DOS BOTÕES (SISTEMA)" tooltip="Aplica-se à cor de fundo dos botões primários no sistema e na tela de login.">
                        <ColorPicker
                          value={data.colorButtonsSystem || data.colorButtons || '#661C16'}
                          onChange={v => updateSystemButtons({ colorButtonsSystem: v })}
                        />
                      </Field>
                      <Field label="HOVER DOS BOTÕES (SISTEMA)" tooltip="Aplica-se ao hover dos botões primários no sistema e na tela de login.">
                        <ColorPicker
                          value={data.colorButtonsSystemHover || data.colorButtonsHover || '#A52020'}
                          onChange={v => updateSystemButtons({ colorButtonsSystemHover: v })}
                        />
                      </Field>
                    </div>
                    <div style={{ maxWidth: 'calc(50% - 12px)' }}>
                      <Field label="TEXTO DOS BOTÕES (SISTEMA)" tooltip="Aplica-se ao texto dos botões primários no sistema e na tela de login.">
                        <ColorPicker
                          value={data.colorButtonsSystemText || data.colorButtonsText || '#FFFFFF'}
                          onChange={v => updateSystemButtons({ colorButtonsSystemText: v })}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

              {/* 3 - Cores das Fontes */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>3. Cores das Fontes</h3>
                <div className={styles.row2}>
                  <Field label="TÍTULOS 1" tooltip="Aplica-se aos títulos das seções escuras da landing page (Hero, Diferenciais, Artigos, Rodapé) e à tela de login.">
                    <ColorPicker value={data.colorTitlePrimary || '#FFFFFF'} onChange={v => updateColor('colorTitlePrimary', v)} />
                  </Field>
                  <Field label="TÍTULOS 2" tooltip="Aplica-se aos títulos das seções claras da landing page e aos títulos das páginas internas do sistema.">
                    <ColorPicker value={data.colorTitleSecondary || '#232C43'} onChange={v => updateColor('colorTitleSecondary', v)} />
                  </Field>
                </div>
                <div className={styles.row2} style={{ marginTop: 16 }}>
                  <Field label="TEXTOS 1" tooltip="Aplica-se aos parágrafos das seções escuras da landing page e à tela de login.">
                    <ColorPicker value={data.colorTextPrimary || '#FFFFFF'} onChange={v => updateColor('colorTextPrimary', v)} />
                  </Field>
                  <Field label="TEXTOS 2" tooltip="Aplica-se aos parágrafos das seções claras da landing page e ao texto secundário do sistema.">
                    <ColorPicker value={data.colorTextSecondary || '#6B7280'} onChange={v => updateColor('colorTextSecondary', v)} />
                  </Field>
                </div>
                <div className={styles.row2} style={{ marginTop: 16 }}>
                  <Field label="LINKS 1" tooltip="Aplica-se aos links das seções escuras da landing page (Navbar, Artigos, Rodapé).">
                    <ColorPicker value={data.colorLinkPrimary || '#FFFFFF'} onChange={v => updateColor('colorLinkPrimary', v)} />
                  </Field>
                  <Field label="LINKS 2" tooltip="Aplica-se aos links textuais e às ações secundárias do sistema.">
                    <ColorPicker value={data.colorLinkSecondary || '#661C16'} onChange={v => updateColor('colorLinkSecondary', v)} />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

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
