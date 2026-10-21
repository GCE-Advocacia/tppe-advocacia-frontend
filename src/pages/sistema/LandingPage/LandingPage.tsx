import { ImageIcon, Loader2, X, Check } from 'lucide-react';
import SectionCard from './components/SectionCard';
import ConteudoSections from './components/ConteudoSections';
import CoresSection from './components/CoresSection';
import LogoSettings from '../../../components/sistema/shared/Logo config/LogoSettings';
import { usePersonalizacaoForm } from './hooks/usePersonalizacaoForm';
import { usePersonalizacaoThemes } from './hooks/usePersonalizacaoThemes';
import styles from './LandingPage.module.css';

export default function LandingPageConfig() {
  const form = usePersonalizacaoForm();
  const themes = usePersonalizacaoThemes({
    data: form.data,
    saved: form.saved,
    loading: form.loading,
    setData: form.setData,
    setSaved: form.setSaved,
  });

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
      <h1 className={styles.pageTitle}>Configuração da Landing Page</h1>

      {/* ── Logos e ícone do navegador ── */}
      <SectionCard icon={<ImageIcon size={20} />} title="Logos e ícone do navegador">
        <LogoSettings draft={form.branding} saving={form.saving} />
      </SectionCard>

      {/* ── Seções de Conteúdo da Landing Page ── */}
      <ConteudoSections data={form.data} onChange={form.set} />

      {/* ── Identidade Visual / Cores ── */}
      <CoresSection
        data={form.data}
        themes={themes}
        brandingSave={form.branding.save}
        applyConfig={form.applyConfig}
        onQuotaExceeded={form.setSaveError}
      />

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
            <X size={15} /> Restaurar salvas
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
