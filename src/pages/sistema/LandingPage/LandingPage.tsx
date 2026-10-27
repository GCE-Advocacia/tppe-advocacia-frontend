import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Palette, Globe, Loader2, X, Check } from 'lucide-react';
import IdentidadeVisualTab from './tabs/IdentidadeVisualTab';
import LandingPageConteudoTab from './tabs/LandingPageConteudoTab';
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
        <p style={{ color: '#c0392b', fontSize: '0.95rem' }}>{form.loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Personalização do Sistema</h1>
        <p className={styles.pageSubtitle}>
          Gerencie a identidade visual da sua marca e o conteúdo da vitrine pública do seu escritório.
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
    </div>
  );
}
