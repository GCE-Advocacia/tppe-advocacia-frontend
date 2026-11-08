import { Palette, BookOpen, Info, RotateCcw } from 'lucide-react';
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
    isColorsDirty, discardColorChanges,
    handleSelectFromLibrary, fetchThemes,
    showThemeGalleryModal, setShowThemeGalleryModal,
    showSaveCurrentModal, isForkingPredefined,
    newThemeName, newThemeDesc,
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
                background: 'none',
                border: `1px solid ${isColorsDirty ? '#d1d5db' : '#e5e7eb'}`,
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: isColorsDirty ? 'var(--navy)' : '#9ca3af',
                cursor: isColorsDirty ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: isColorsDirty ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
              disabled={!isColorsDirty}
              onClick={discardColorChanges}
              title={isColorsDirty ? "Desfaz apenas as alterações de cores e restaura a configuração salva no escritório" : "Nenhuma alteração de cor pendente"}
            >
              <RotateCcw size={13} /> Descartar Alterações de Cores
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
                  <Field
                    label="BACKGROUND 1"
                    tooltip={`Landing Page: fundo das seções principais (Navbar, Hero, Diferenciais, Artigos e Rodapé).\nSistema: fundo da Barra Lateral (Sidebar), cabeçalhos de modais e painel da calculadora de prazos.`}
                  >
                    <ColorPicker value={data.colorBgPrimary || '#232C43'} onChange={v => updateColor('colorBgPrimary', v)} />
                  </Field>
                  <Field
                    label="BACKGROUND 2"
                    tooltip="Landing Page: fundo das seções claras alternadas (Sobre o Escritório, Áreas de Atuação e Contato)."
                  >
                    <ColorPicker value={data.colorBgSecondary || '#F5F3EF'} onChange={v => updateColor('colorBgSecondary', v)} />
                  </Field>
                </div>
                <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
                  <Field
                    label="BACKGROUND 3"
                    tooltip='Landing Page: fundo exclusivo da seção "Sobre o Advogado".'
                  >
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
                    <span
                      className={styles.tooltipWrapper}
                      tabIndex={0}
                      aria-label="Quando marcado, os botões primários do sistema interno e da tela de login herdam automaticamente as cores dos botões da landing page pública. Desmarque para definir cores exclusivas para o sistema."
                    >
                      <Info size={13} className={styles.tooltipIcon} />
                      <span className={styles.tooltipText}>
                        Quando marcado, os botões primários do sistema interno e da tela de login herdam automaticamente as cores dos botões da landing page pública. Desmarque para definir cores exclusivas para o sistema.
                      </span>
                    </span>
                  </label>
                </div>

                <div className={styles.row2}>
                  <Field
                    label="FUNDO DOS BOTÕES"
                    tooltip={`Landing Page: cor principal dos botões de ação (Agendar Consulta, WhatsApp e Enviar Mensagem).\nSistema e Login (quando vinculado): botões primários, filtros ativos, paginação ativa e destaque da aba selecionada.`}
                  >
                    <ColorPicker value={data.colorButtons || '#661C16'} onChange={v => updateColor('colorButtons', v)} />
                  </Field>
                  <Field
                    label="HOVER DOS BOTÕES"
                    tooltip="Landing Page (e Sistema/Login quando vinculado): cor exibida ao passar o mouse sobre os botões primários de ação."
                  >
                    <ColorPicker value={data.colorButtonsHover || '#A52020'} onChange={v => updateColor('colorButtonsHover', v)} />
                  </Field>
                </div>
                <div style={{ marginTop: 16, maxWidth: 'calc(50% - 12px)' }}>
                  <Field
                    label="TEXTO DOS BOTÕES"
                    tooltip="Landing Page (e Sistema/Login quando vinculado): cor do texto e dos ícones internos dos botões primários."
                  >
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
                        Personalize os botões das páginas internas e da tela de login de forma independente da landing page.
                      </p>
                    </div>
                    <div className={styles.row2}>
                      <Field
                        label="FUNDO DOS BOTÕES (SISTEMA)"
                        tooltip='Sistema e Login: cor de fundo exclusiva para os botões primários, filtros ativos, paginação selecionada e botão "Entrar".'
                      >
                        <ColorPicker
                          value={data.colorButtonsSystem || data.colorButtons || '#661C16'}
                          onChange={v => updateSystemButtons({ colorButtonsSystem: v })}
                        />
                      </Field>
                      <Field
                        label="HOVER DOS BOTÕES (SISTEMA)"
                        tooltip="Sistema e Login: cor exibida ao passar o mouse sobre os botões primários do painel interno e da tela de login."
                      >
                        <ColorPicker
                          value={data.colorButtonsSystemHover || data.colorButtonsHover || '#A52020'}
                          onChange={v => updateSystemButtons({ colorButtonsSystemHover: v })}
                        />
                      </Field>
                    </div>
                    <div style={{ maxWidth: 'calc(50% - 12px)' }}>
                      <Field
                        label="TEXTO DOS BOTÕES (SISTEMA)"
                        tooltip="Sistema e Login: cor do texto e dos ícones internos dos botões primários do painel e do login."
                      >
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
                  <Field
                    label="TÍTULOS 1"
                    tooltip="Landing Page: títulos principais sobre as seções de fundo escuro/Background 1 (Hero, Diferenciais e Artigos) e botão secundário vazado do Hero."
                  >
                    <ColorPicker value={data.colorTitlePrimary || '#FFFFFF'} onChange={v => updateColor('colorTitlePrimary', v)} />
                  </Field>
                  <Field
                    label="TÍTULOS 2"
                    tooltip={`Landing Page: títulos sobre as seções claras (Sobre o Escritório, Áreas de Atuação, Sobre o Advogado e Contato).\nSistema e Login: títulos principais das páginas internas e cabeçalho da tela de login.`}
                  >
                    <ColorPicker value={data.colorTitleSecondary || '#232C43'} onChange={v => updateColor('colorTitleSecondary', v)} />
                  </Field>
                </div>
                <div className={styles.row2} style={{ marginTop: 16 }}>
                  <Field
                    label="TEXTOS 1"
                    tooltip={`Landing Page: parágrafos, subtítulos e datas sobre as seções de fundo escuro/Background 1 (Hero, Diferenciais, Artigos e Rodapé).\nSistema: textos informativos sobre superfícies escuras (rodapé de perfil na Sidebar, títulos de modais e calculadora de prazos).`}
                  >
                    <ColorPicker value={data.colorTextPrimary || '#FFFFFF'} onChange={v => updateColor('colorTextPrimary', v)} />
                  </Field>
                  <Field
                    label="TEXTOS 2"
                    tooltip="Landing Page: parágrafos, descrições e rótulos informativos sobre as seções claras (Sobre o Escritório, Áreas de Atuação, Sobre o Advogado e Contato)."
                  >
                    <ColorPicker value={data.colorTextSecondary || '#6B7280'} onChange={v => updateColor('colorTextSecondary', v)} />
                  </Field>
                </div>
                <div className={styles.row2} style={{ marginTop: 16 }}>
                  <Field
                    label="LINKS 1"
                    tooltip={`Landing Page: links de navegação sobre as seções de fundo escuro/Background 1 (menu da Navbar, links de Artigos e Rodapé).\nSistema: títulos e ícones de navegação do menu lateral (Sidebar).`}
                  >
                    <ColorPicker value={data.colorLinkPrimary || '#FFFFFF'} onChange={v => updateColor('colorLinkPrimary', v)} />
                  </Field>
                  <Field
                    label="LINKS 2"
                    tooltip={`Landing Page: links de destaque nas seções claras ("Conheça nossa história" e links de Contato).\nSistema e Login: links e ações secundárias ("Esqueceu a senha?", aba ativa, subtítulos de módulo e ação "Limpar filtros").`}
                  >
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
        initialThemeName={newThemeName}
        initialThemeDesc={newThemeDesc}
        saving={savingNewTheme}
        error={saveNewError}
        onConfirm={(name, desc) => handleSaveCurrentAsTheme(name, desc, brandingSave, applyConfig)}
      />
    </>
  );
}
