import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Palette, Globe, Loader2, X, Check } from 'lucide-react';
import IdentidadeVisualTab from './tabs/IdentidadeVisualTab';
import LandingPageConteudoTab from './tabs/LandingPageConteudoTab';
import SaveThemeModal from './components/SaveThemeModal';
import { usePersonalizacaoForm } from './hooks/usePersonalizacaoForm';
import { usePersonalizacaoThemes } from './hooks/usePersonalizacaoThemes';
import styles from './LandingPage.module.css';

export type PersonalizacaoTab = 'identidade' | 'conteudo';

export default function LandingPageConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: PersonalizacaoTab = rawTab === 'conteudo' ? 'conteudo' : 'identidade';

  useEffect(() => {
    if (rawTab !== 'identidade' && rawTab !== 'conteudo') {
      setSearchParams({ tab: 'identidade' }, { replace: true });
    }
  }, [rawTab, setSearchParams]);

  const form = usePersonalizacaoForm();
  const themes = usePersonalizacaoThemes({
    data: form.data,
    saved: form.saved,
    loading: form.loading,
    setData: form.setData,
    setSaved: form.setSaved,
  });

  const handleTabChange = (tab: PersonalizacaoTab) => {
    if (tab !== activeTab) {
      setSearchParams({ tab });
    }
  };

  const handleSave = () => form.save(themes);
  const handleDiscard = () => form.discard(themes);

  if (form.loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#666' }} />
      </div>
    );
  }

  if (form.loadError) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--color-danger)', fontSize: '0.95rem' }}>{form.loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Personalização do Sistema</h1>
        <p className={styles.pageSubtitle}>
          Gerencie a identidade visual da sua marca e o conteúdo da landing page pública do seu escritório.
        </p>
      </header>

      {/* ── Abas de Navegação ── */}
      <nav className={styles.tabsBar} role="tablist" aria-label="Abas de Personalização">
        <button
          type="button"
          role="tab"
          id="tab-identidade"
          aria-selected={activeTab === 'identidade'}
          aria-controls="panel-identidade"
          className={`${styles.tabBtn} ${activeTab === 'identidade' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabChange('identidade')}
        >
          <Palette size={17} /> Identidade Visual &amp; Cores
        </button>
        <button
          type="button"
          role="tab"
          id="tab-conteudo"
          aria-selected={activeTab === 'conteudo'}
          aria-controls="panel-conteudo"
          className={`${styles.tabBtn} ${activeTab === 'conteudo' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabChange('conteudo')}
        >
          <Globe size={17} /> Conteúdo da Landing Page
        </button>
      </nav>

      {/* ── Painel da Aba Ativa ── */}
      {activeTab === 'identidade' && (
        <div id="panel-identidade" role="tabpanel" aria-labelledby="tab-identidade">
          <IdentidadeVisualTab
            data={form.data}
            onChange={form.set}
            themes={themes}
            branding={form.branding}
            saving={form.saving}
            applyConfig={form.applyConfig}
            onQuotaExceeded={form.setSaveError}
          />
        </div>
      )}

      {activeTab === 'conteudo' && (
        <div id="panel-conteudo" role="tabpanel" aria-labelledby="tab-conteudo">
          <LandingPageConteudoTab
            data={form.data}
            onChange={form.set}
          />
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div
        data-pending-changes={form.isDirty ? 'true' : 'false'}
        className={`${styles.bottomBar} ${form.isDirty || form.saveError ? styles.bottomBarVisible : ''}`}
      >
        {form.saveError && (
          <span role="alert" className={styles.bottomError}>{form.saveError}</span>
        )}
        {!form.saveError && (
          <span className={styles.bottomMsg}>
            <span className={styles.dot} /> Alterações não salvas detectadas...
          </span>
        )}
        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.btnDiscard}
            onClick={handleDiscard}
            disabled={form.saving || !form.isDirty}
          >
            <X size={15} /> Descartar
          </button>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={form.saving || !form.isDirty || (form.branding.dirty && !form.branding.ready)}
          >
            {form.saving ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...
              </>
            ) : (
              <>
                <Check size={15} /> Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>

      {form.confirmThemeUpdate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox} role="dialog" aria-modal="true" aria-labelledby="update-theme-title">
            <div className={styles.modalHeader}>
              <h3 id="update-theme-title" className={styles.modalTitle}>Salvar alterações no tema</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Atualize o tema “{themes.baseTheme?.name}” ou preserve o original salvando uma cópia.</p>
              {form.saveError && <p role="alert" className={styles.modalError}>{form.saveError}</p>}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} disabled={form.saving} onClick={() => form.setConfirmThemeUpdate(false)}>Cancelar</button>
              <button type="button" className={styles.btnCancel} disabled={form.saving} onClick={() => {
                form.setConfirmThemeUpdate(false);
                themes.openCopyModal();
              }}>Salvar como uma cópia separada</button>
              <button type="button" className={styles.btnConfirm} disabled={form.saving} onClick={() => form.save(themes, true)}>
                {form.saving ? 'Salvando...' : 'Atualizar tema'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Alterações não salvas ao sair da página ── */}
      {form.pendingNavigationPath && (
        <div
          className={styles.modalOverlay}
          onMouseDown={e => {
            if (e.target === e.currentTarget) form.cancelNavigation();
          }}
        >
          <div className={styles.modalBox} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unsaved-modal-title">
            <div className={styles.modalHeader}>
              <h3 id="unsaved-modal-title" className={styles.modalTitle}>Alterações não salvas</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={form.cancelNavigation}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0, lineHeight: 1.55 }}>
                Existem alterações não salvas na personalização. Se você sair agora, as alterações pendentes serão descartadas.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={form.cancelNavigation}
              >
                Continuar editando
              </button>
              <button
                type="button"
                className={styles.btnConfirm}
                onClick={form.confirmNavigation}
              >
                Sair e descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Global: Salvar/Fork de Tema Personalizado (funciona em qualquer aba) ── */}
      <SaveThemeModal
        isOpen={themes.showSaveCurrentModal}
        onClose={themes.closeSaveModal}
        isForkingPredefined={themes.isForkingPredefined}
        baseThemeName={themes.baseTheme?.name}
        colors={form.data}
        initialThemeName={themes.newThemeName}
        initialThemeDesc={themes.newThemeDesc}
        saving={themes.savingNewTheme}
        limitReached={themes.themeQuota?.is_limit_reached ?? themes.themes.filter(t => !t.is_predefined).length >= 6}
        maxCustom={themes.themeQuota?.max_custom ?? 6}
        error={themes.saveNewError}
        onConfirm={(name, desc) =>
          themes.handleSaveCurrentAsTheme(name, desc, form.branding.save, form.applyConfig)
        }
      />
    </div>
  );
}
