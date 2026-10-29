import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, PlugZap, Save, Send, XCircle } from 'lucide-react';
import Modal from '../../../components/sistema/Modal/Modal';
import { ApiError } from '../../../services/api';
import {
  listEmailProfiles,
  saveEmailProfile,
  sendTestEmail,
  testEmailConnection,
  type ConnectionStep,
  type ConnectionTestResult,
  type EmailProfile,
  type EmailProfileForm,
} from '../../../services/emailSettings';
import styles from './ConfiguracoesEmail.module.css';

const STEP_LABEL: Record<ConnectionStep, string> = {
  connect: 'Conectar ao servidor',
  ehlo: 'Apresentação (EHLO)',
  tls: 'Criptografia (TLS)',
  auth: 'Login',
};

const PORT_PRESETS = [
  { port: 587, security: 'starttls' as const, label: '587 · STARTTLS' },
  { port: 465, security: 'ssl' as const, label: '465 · SSL' },
];

function toForm(profile: EmailProfile): EmailProfileForm {
  return {
    provider: profile.provider,
    host: profile.host ?? '',
    port: profile.port,
    security: profile.security,
    username: profile.username ?? '',
    secret: '',
    from_email: profile.from_email ?? '',
    from_name: profile.from_name ?? '',
    reply_to: profile.reply_to ?? '',
    is_active: profile.is_active,
  };
}

function signature(form: EmailProfileForm): string {
  return JSON.stringify(form);
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return 'Outra pessoa alterou este perfil. Recarregue a página e refaça a alteração.';
    if (err.status === 429) return 'Muitos envios de teste. Aguarde um minuto e tente de novo.';
    return err.message;
  }
  return fallback;
}

type CardProps = {
  profile: EmailProfile;
  onSaved: (profile: EmailProfile) => void;
  onDirtyChange: (id: number, dirty: boolean) => void;
};

function ProfileCard({ profile, onSaved, onDirtyChange }: CardProps) {
  const initial = useMemo(() => toForm(profile), [profile]);
  const [form, setForm] = useState<EmailProfileForm>(initial);
  const [test, setTest] = useState<ConnectionTestResult | null>(null);
  const [testedSignature, setTestedSignature] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => { setForm(initial); }, [initial]);

  const dirty = signature(form) !== signature(initial);
  useEffect(() => { onDirtyChange(profile.id, dirty); }, [dirty, profile.id, onDirtyChange]);

  const testedCurrent = test?.ok === true && testedSignature === signature(form);
  // Desativar não exige teste; ativar ou alterar um perfil ativo, sim.
  const canSave = dirty && !saving && (!form.is_active || testedCurrent);
  const isResend = form.provider === 'resend';

  function update<K extends keyof EmailProfileForm>(key: K, value: EmailProfileForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    const tested = signature(form);
    try {
      const result = await testEmailConnection(profile.id, form);
      setTest(result);
      setTestedSignature(tested);
    } catch (err) {
      setTest(null);
      setMessage({ kind: 'error', text: errorMessage(err, 'Não foi possível testar a conexão.') });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveEmailProfile(profile.id, form, profile.version);
      onSaved(saved);
      setTest(null);
      setTestedSignature(null);
      setMessage({ kind: 'ok', text: 'Configuração salva. Os próximos e-mails já saem por ela.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err, 'Não foi possível salvar.') });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setSending(true);
    setMessage(null);
    try {
      const result = await sendTestEmail(profile.id, sendTo);
      setMessage({ kind: 'ok', text: `E-mail de teste enviado para ${sendTo} (${result.duration_ms} ms).` });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err, 'Não foi possível enviar o e-mail de teste.') });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`profile-${profile.id}`}>
      <header className={styles.cardHeader}>
        <div>
          <h2 id={`profile-${profile.id}`}>{profile.priority === 1 ? 'Primário' : 'Reserva'}</h2>
          <p className={styles.cardHint}>
            {profile.priority === 1
              ? 'Todos os e-mails saem por aqui.'
              : 'Usado automaticamente quando o primário falha.'}
          </p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => update('is_active', e.target.checked)}
          />
          <span>{form.is_active ? 'Ativo' : 'Desativado'}</span>
        </label>
      </header>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Provedor</span>
          <select value={form.provider} onChange={e => update('provider', e.target.value as EmailProfileForm['provider'])}>
            <option value="smtp">SMTP</option>
            <option value="resend">Resend (API)</option>
          </select>
        </label>

        {!isResend && (
          <>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>Servidor (host)</span>
              <input
                value={form.host}
                placeholder="smtp.gmail.com"
                onChange={e => update('host', e.target.value)}
              />
            </label>

            <div className={styles.field}>
              <label htmlFor={`port-${profile.id}`}>Porta</label>
              <input
                id={`port-${profile.id}`}
                type="number"
                min={1}
                max={65535}
                value={form.port ?? ''}
                onChange={e => update('port', e.target.value ? Number(e.target.value) : null)}
              />
              <div className={styles.presets}>
                {PORT_PRESETS.map(p => (
                  <button
                    key={p.port}
                    type="button"
                    className={styles.preset}
                    onClick={() => setForm(current => ({ ...current, port: p.port, security: p.security }))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.field}>
              <span>Segurança</span>
              <select value={form.security} onChange={e => update('security', e.target.value as EmailProfileForm['security'])}>
                <option value="starttls">STARTTLS</option>
                <option value="ssl">SSL/TLS</option>
                <option value="none">Nenhuma</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Usuário</span>
              <input
                value={form.username}
                autoComplete="off"
                onChange={e => update('username', e.target.value)}
              />
            </label>
          </>
        )}

        <label className={`${styles.field} ${isResend ? styles.span2 : ''}`}>
          <span>{isResend ? 'API key' : 'Senha'}</span>
          <input
            type="password"
            value={form.secret}
            autoComplete="new-password"
            placeholder={profile.has_secret ? '•••••• salva (deixe vazio para manter)' : ''}
            onChange={e => update('secret', e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>E-mail do remetente</span>
          <input
            type="email"
            value={form.from_email}
            placeholder="contato@escritorio.com"
            onChange={e => update('from_email', e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Nome do remetente</span>
          <input value={form.from_name} onChange={e => update('from_name', e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>Responder para</span>
          <input
            type="email"
            value={form.reply_to}
            placeholder="Opcional"
            onChange={e => update('reply_to', e.target.value)}
          />
        </label>
      </div>

      {test && (
        <ol className={styles.timeline} aria-label="Etapas do teste de conexão">
          {test.steps.map(step => (
            <li key={step.step} className={step.ok ? styles.stepOk : styles.stepFail}>
              {step.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span className={styles.stepName}>{STEP_LABEL[step.step]}</span>
              <span className={styles.stepTime}>{step.duration_ms} ms</span>
              {step.error && <p className={styles.stepError}>{step.error}</p>}
            </li>
          ))}
          {test.ok && testedSignature !== signature(form) && (
            <li className={styles.stepStale}>A configuração mudou depois do teste. Teste de novo para salvar.</li>
          )}
        </ol>
      )}

      {message && (
        <p className={message.kind === 'ok' ? styles.msgOk : styles.msgError} role="status">
          {message.text}
        </p>
      )}

      <footer className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 size={16} className={styles.spin} /> : <PlugZap size={16} />}
          Testar conexão
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={handleSave}
          disabled={!canSave}
          title={canSave || !dirty ? undefined : 'Teste a conexão com sucesso antes de salvar.'}
        >
          {saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
          Salvar
        </button>
      </footer>

      {profile.is_active && !dirty && (
        <div className={styles.sendTest}>
          <input
            type="email"
            value={sendTo}
            placeholder="destino@exemplo.com"
            aria-label="Destinatário do e-mail de teste"
            onChange={e => setSendTo(e.target.value)}
          />
          <button type="button" className={styles.secondary} onClick={handleSendTest} disabled={!sendTo || sending}>
            {sending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
            Enviar e-mail de teste
          </button>
        </div>
      )}
    </section>
  );
}

export default function ConfiguracoesEmail() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<EmailProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    listEmailProfiles()
      .then(setProfiles)
      .catch(() => setError('Não foi possível carregar a configuração de e-mail.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDirtyChange = useCallback((id: number, dirty: boolean) => {
    setDirtyIds(current => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const hasUnsaved = dirtyIds.size > 0;

  // Aviso ao fechar/recarregar a aba.
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // Aviso ao navegar pelos links do sistema (o BrowserRouter não tem useBlocker).
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || e.metaKey || e.ctrlKey) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [hasUnsaved]);

  function handleSaved(saved: EmailProfile) {
    setProfiles(current => current.map(p => (p.id === saved.id ? saved : p)));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Comunicação</p>
        <h1>Configurações de e-mail</h1>
        <p className={styles.subtitle}>
          Servidor por onde saem os e-mails do sistema. Se o primário falhar, o reserva assume. A alteração vale na hora.
        </p>
      </header>

      {error && <p className={styles.msgError}>{error}</p>}

      <div className={styles.cards}>
        {loading
          ? [1, 2].map(i => <div key={i} className={styles.skeletonCard} />)
          : profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSaved={handleSaved}
                onDirtyChange={handleDirtyChange}
              />
            ))}
      </div>

      {pendingHref && (
        <Modal title="Sair sem salvar?" onClose={() => setPendingHref(null)} width={420}>
          <p className={styles.modalText}>Há alterações não salvas na configuração de e-mail. Se sair agora, elas serão perdidas.</p>
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondary} onClick={() => setPendingHref(null)}>
              Continuar editando
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                const href = pendingHref;
                setDirtyIds(new Set());
                setPendingHref(null);
                navigate(href);
              }}
            >
              Sair sem salvar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
