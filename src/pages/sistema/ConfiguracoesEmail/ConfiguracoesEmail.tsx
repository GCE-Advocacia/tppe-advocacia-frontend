import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Eye, Inbox, Loader2,
  Mail, PlugZap, Save, Send, ShieldCheck, XCircle,
} from 'lucide-react';
import Modal from '../../../components/sistema/Modal/Modal';
import { ApiError } from '../../../services/api';
import { previewEmailTemplate } from '../../../services/emailTemplates';
import {
  getEmailOverview,
  getEmailStatus,
  listEmailPresets,
  saveEmailAccount,
  saveEmailIdentity,
  sendTestToMe,
  testEmailAccount,
  type ConnectionTestResult,
  type EmailAccountForm,
  type EmailHealthState,
  type EmailOverview,
  type EmailStatus,
  type PresetId,
  type ProviderPreset,
} from '../../../services/emailSettings';
import styles from './ConfiguracoesEmail.module.css';

const STATE_LABEL: Record<EmailHealthState, string> = {
  ok: 'Funcionando',
  degraded: 'Com problema',
  down: 'Parado',
};

const STATE_ICON: Record<EmailHealthState, typeof CheckCircle2> = {
  ok: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
};

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function formatDateTime(value: string | null): string | null {
  return value ? DATE_TIME.format(new Date(value)) : null;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return 'Outra pessoa alterou esta configuração. Recarregue a página e refaça a alteração.';
    if (err.status === 429) return 'Muitos testes seguidos. Aguarde um minuto e tente de novo.';
    return err.message;
  }
  return fallback;
}

function domainOf(address: string): string {
  const at = address.lastIndexOf('@');
  return at >= 0 ? address.slice(at + 1).trim().toLowerCase() : '';
}

/** Mesmo aviso do backend, calculado enquanto o admin digita. */
function senderWarning(from: string, account: string, preset: ProviderPreset | undefined): string | null {
  if (!from || !account || !from.includes('@') || !account.includes('@')) return null;
  if (preset?.sender_must_match) {
    return from.toLowerCase() === account.toLowerCase()
      ? null
      : `O ${preset.name} só envia como ${account}. Use esse mesmo e-mail como remetente, senão os e-mails podem ser recusados ou cair no spam.`;
  }
  return domainOf(from) === domainOf(account)
    ? null
    : `O remetente ${from} é de outro domínio que a conta ${account}. Muitos servidores recusam ou mandam para o spam. Use um e-mail @${domainOf(account)}.`;
}

function emptyForm(): EmailAccountForm {
  return {
    preset: 'gmail',
    host: '',
    port: 587,
    security: 'starttls',
    username: '',
    secret: '',
    from_email: '',
    is_active: true,
  };
}

// ── Bloco Status ───────────────────────────────────────────
interface StatusCardProps {
  status: EmailStatus | null;
  onSent: () => void;
}

function StatusCard({ status, onSent }: StatusCardProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function handleSend() {
    setSending(true);
    setMessage(null);
    try {
      const result = await sendTestToMe();
      const via = result.fallback_used
        ? ' Sua conta falhou, então ele saiu pela conta do sistema.'
        : '';
      setMessage({ kind: result.fallback_used ? 'error' : 'ok', text: `E-mail de teste enviado para ${result.to}. Confira a caixa de entrada.${via}` });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err, 'Não foi possível enviar o e-mail de teste.') });
    } finally {
      setSending(false);
      onSent();
    }
  }

  if (!status) {
    return <div className={`${styles.card} ${styles.skeletonBlock}`} aria-hidden="true" />;
  }

  const Icon = STATE_ICON[status.state];
  const lastSent = formatDateTime(status.last_sent_at);
  const lastTest = formatDateTime(status.last_test_at);

  return (
    <section className={styles.card} aria-labelledby="email-status">
      <header className={styles.cardHeader}>
        <div>
          <h2 id="email-status">Status</h2>
          <p className={styles.cardHint}>Se os e-mails do escritório estão chegando.</p>
        </div>
        <span className={`${styles.seal} ${styles[`seal_${status.state}`]}`}>
          <Icon size={15} aria-hidden="true" /> {STATE_LABEL[status.state]}
        </span>
      </header>

      <p className={styles.statusMessage}>{status.message}</p>

      <dl className={styles.facts}>
        <div>
          <dt>Enviando por</dt>
          <dd>
            {status.account === 'own'
              ? status.account_email ?? 'Seu e-mail'
              : 'E-mail do sistema'}
          </dd>
        </div>
        <div>
          <dt>Último envio</dt>
          <dd>{lastSent ?? 'Nenhum e-mail enviado ainda'}</dd>
        </div>
        <div>
          <dt>Último teste</dt>
          <dd>
            {lastTest
              ? `${lastTest} · ${status.last_test_ok ? 'deu certo' : 'não foi enviado'}`
              : 'Nenhum teste ainda'}
          </dd>
        </div>
      </dl>

      {status.last_test_ok === false && status.last_test_error && (
        <p className={styles.msgError}>{status.last_test_error}</p>
      )}
      {message && (
        <p className={message.kind === 'ok' ? styles.msgOk : styles.msgError} role="status">
          {message.text}
        </p>
      )}

      <footer className={styles.actions}>
        <Link to="/sistema/emails" className={styles.linkAction}>
          <Inbox size={16} aria-hidden="true" /> Ver e-mails enviados
        </Link>
        <button type="button" className={styles.primary} onClick={() => void handleSend()} disabled={sending}>
          {sending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
          Enviar teste para mim
        </button>
      </footer>
    </section>
  );
}

// ── Bloco Identidade ───────────────────────────────────────
interface IdentityCardProps {
  overview: EmailOverview;
  senderEmail: string | null;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

function IdentityCard({ overview, senderEmail, onSaved, onDirtyChange }: IdentityCardProps) {
  const initial = useMemo(
    () => ({ from_name: overview.identity.from_name ?? '', reply_to: overview.identity.reply_to ?? '' }),
    [overview.identity],
  );
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => { setForm(initial); }, [initial]);

  const dirty = form.from_name !== initial.from_name || form.reply_to !== initial.reply_to;
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await saveEmailIdentity(form, overview.identity.version);
      setMessage({ kind: 'ok', text: 'Salvo. Os próximos e-mails já saem assim.' });
      onSaved();
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err, 'Não foi possível salvar.') });
    } finally {
      setSaving(false);
    }
  }

  async function openPreview() {
    setLoadingPreview(true);
    try {
      const result = await previewEmailTemplate('payment_reminder_d5', 'html');
      setPreview({ subject: result.subject, html: result.content });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err, 'Não foi possível carregar a pré-visualização.') });
    } finally {
      setLoadingPreview(false);
    }
  }

  const fromLabel = form.from_name.trim() || 'Nome do escritório';

  return (
    <section className={styles.card} aria-labelledby="email-identity">
      <header className={styles.cardHeader}>
        <div>
          <h2 id="email-identity">Identidade</h2>
          <p className={styles.cardHint}>Como o cliente vê os e-mails que o sistema manda.</p>
        </div>
      </header>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Nome do remetente</span>
          <input
            value={form.from_name}
            maxLength={255}
            placeholder="Ex.: Souza & Lima Advocacia"
            onChange={e => { setForm(f => ({ ...f, from_name: e.target.value })); setMessage(null); }}
          />
          <small className={styles.fieldHelp}>Aparece no lugar do endereço na caixa de entrada do cliente.</small>
        </label>
        <label className={styles.field}>
          <span>Responder para</span>
          <input
            type="email"
            value={form.reply_to}
            placeholder="Ex.: contato@escritorio.com.br"
            onChange={e => { setForm(f => ({ ...f, reply_to: e.target.value })); setMessage(null); }}
          />
          <small className={styles.fieldHelp}>Quando o cliente clicar em "Responder", a resposta vai para este e-mail.</small>
        </label>
      </div>

      {message && (
        <p className={message.kind === 'ok' ? styles.msgOk : styles.msgError} role="status">
          {message.text}
        </p>
      )}

      <footer className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => void openPreview()} disabled={loadingPreview}>
          {loadingPreview ? <Loader2 size={16} className={styles.spin} /> : <Eye size={16} />}
          Ver como fica
        </button>
        <button type="button" className={styles.primary} onClick={() => void handleSave()} disabled={!dirty || saving}>
          {saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
          Salvar
        </button>
      </footer>

      {preview && (
        <Modal title="Como o cliente recebe" onClose={() => setPreview(null)} width={720}>
          <div className={styles.mailHeader}>
            <p><span>De</span> <strong>{fromLabel}</strong> {senderEmail && <em>&lt;{senderEmail}&gt;</em>}</p>
            {form.reply_to.trim() && <p><span>Responder para</span> {form.reply_to.trim()}</p>}
            <p><span>Assunto</span> {preview.subject}</p>
          </div>
          <iframe className={styles.previewFrame} title="Pré-visualização do e-mail" sandbox="" srcDoc={preview.html} />
          <p className={styles.fieldHelp}>Exemplo com o lembrete de pagamento. Todos os e-mails usam o mesmo layout.</p>
        </Modal>
      )}
    </section>
  );
}

// ── Assistente da conta própria ────────────────────────────
interface WizardProps {
  overview: EmailOverview;
  presets: ProviderPreset[];
  onDone: (message: string) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

const STEPS = ['Provedor', 'Conta', 'Testar e ativar'];

function AccountWizard({ overview, presets, onDone, onCancel, onDirtyChange }: WizardProps) {
  const own = overview.own_account;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EmailAccountForm>(() => {
    if (own && own.username) {
      return {
        preset: own.preset ?? 'other',
        host: own.host ?? '',
        port: own.port,
        security: own.security,
        username: own.username,
        secret: '',
        from_email: own.from_email ?? '',
        is_active: true,
      };
    }
    return emptyForm();
  });
  const [test, setTest] = useState<ConnectionTestResult | null>(null);
  const [testedKey, setTestedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(true);
    return () => onDirtyChange(false);
  }, [onDirtyChange]);

  const preset = presets.find(p => p.id === form.preset);
  const isOther = form.preset === 'other';
  const sender = form.from_email.trim() || form.username.trim();
  const warning = senderWarning(sender, form.username.trim(), preset);
  const key = JSON.stringify(form);
  const testedCurrent = test?.ok === true && testedKey === key;
  const hasSavedSecret = Boolean(own?.has_secret && own.username === form.username);

  function update<K extends keyof EmailAccountForm>(field: K, value: EmailAccountForm[K]) {
    setForm(f => ({ ...f, [field]: value }));
    setError(null);
  }

  function choosePreset(p: ProviderPreset) {
    setForm(f => ({
      ...f,
      preset: p.id,
      host: p.host ?? (p.id === 'other' ? f.host : ''),
      port: p.port ?? f.port,
      security: p.security,
    }));
    setTest(null);
  }

  const accountValid =
    form.username.includes('@')
    && (form.secret.length > 0 || hasSavedSecret)
    && (!isOther || (form.host.trim() !== '' && Boolean(form.port)));

  async function handleTest() {
    if (!own) return;
    setBusy('test');
    setError(null);
    try {
      const result = await testEmailAccount(own.id, form);
      setTest(result);
      setTestedKey(key);
    } catch (err) {
      setTest(null);
      setError(errorMessage(err, 'Não foi possível testar agora.'));
    } finally {
      setBusy(null);
    }
  }

  async function handleActivate() {
    if (!own) return;
    setBusy('save');
    setError(null);
    try {
      await saveEmailAccount(own.id, form, own.version);
      onDirtyChange(false);
      onDone(`Pronto. Os e-mails do escritório agora saem por ${sender}. Se ela falhar, a conta do sistema assume sozinha.`);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível ativar.'));
    } finally {
      setBusy(null);
    }
  }

  const failed = test?.steps.find(s => !s.ok);

  return (
    <div className={styles.wizard}>
      <ol className={styles.stepper} aria-label="Etapas">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={i === step ? styles.stepCurrent : i < step ? styles.stepDone : ''}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className={styles.stepNumber}>{i < step ? <CheckCircle2 size={14} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset className={styles.presetGrid}>
          <legend className={styles.srOnly}>Onde fica o e-mail do escritório</legend>
          {presets.map(p => (
            <label key={p.id} className={`${styles.presetOption} ${form.preset === p.id ? styles.presetSelected : ''}`}>
              <input
                type="radio"
                name="preset"
                value={p.id}
                checked={form.preset === p.id}
                onChange={() => choosePreset(p)}
              />
              <Mail size={18} aria-hidden="true" />
              <span>{p.name}</span>
            </label>
          ))}
        </fieldset>
      )}

      {step === 1 && (
        <div className={styles.wizardBody}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>E-mail da conta</span>
              <input
                type="email"
                value={form.username}
                autoComplete="off"
                placeholder="contato@escritorio.com.br"
                onChange={e => update('username', e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Senha de app</span>
              <input
                type="password"
                value={form.secret}
                autoComplete="new-password"
                placeholder={hasSavedSecret ? 'Senha já salva (deixe vazio para manter)' : ''}
                onChange={e => update('secret', e.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>Enviar como</span>
              <input
                type="email"
                value={form.from_email}
                placeholder={form.username || 'Mesmo e-mail da conta'}
                onChange={e => update('from_email', e.target.value)}
              />
              <small className={styles.fieldHelp}>Deixe vazio para usar o próprio e-mail da conta.</small>
            </label>
          </div>

          {preset && (
            <div className={styles.helpBox}>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <p>{preset.password_help}</p>
                {preset.help_url && (
                  <a href={preset.help_url} target="_blank" rel="noopener noreferrer">
                    Como criar a senha de app <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          )}

          {isOther && (
            <div className={styles.grid}>
              <label className={`${styles.field} ${styles.span2}`}>
                <span>Servidor de saída (SMTP)</span>
                <input value={form.host} placeholder="smtp.seudominio.com.br" onChange={e => update('host', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Porta</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port ?? ''}
                  onChange={e => update('port', e.target.value ? Number(e.target.value) : null)}
                />
              </label>
              <label className={styles.field}>
                <span>Segurança</span>
                <select value={form.security} onChange={e => update('security', e.target.value as EmailAccountForm['security'])}>
                  <option value="starttls">STARTTLS (porta 587)</option>
                  <option value="ssl">SSL (porta 465)</option>
                  <option value="none">Nenhuma</option>
                </select>
              </label>
            </div>
          )}

          {warning && <p className={styles.msgWarn} role="status"><AlertTriangle size={15} aria-hidden="true" /> {warning}</p>}
        </div>
      )}

      {step === 2 && (
        <div className={styles.wizardBody}>
          <p className={styles.cardHint}>
            Vamos conferir se o sistema consegue entrar na conta <strong>{form.username}</strong>. Nenhum e-mail é enviado neste teste.
          </p>
          {test && test.ok && testedCurrent && (
            <p className={styles.msgOk} role="status"><CheckCircle2 size={15} aria-hidden="true" /> A conta respondeu. Pode ativar.</p>
          )}
          {test && !test.ok && failed && (
            <div className={styles.msgError} role="alert">
              <strong>{failed.error}</strong>
              {failed.hint && <p className={styles.hint}>{failed.hint}</p>}
            </div>
          )}
          {warning && <p className={styles.msgWarn}><AlertTriangle size={15} aria-hidden="true" /> {warning}</p>}
        </div>
      )}

      {error && <p className={styles.msgError} role="alert">{error}</p>}

      <footer className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={onCancel}>Cancelar</button>
        {step > 0 && (
          <button type="button" className={styles.secondary} onClick={() => setStep(s => s - 1)}>Voltar</button>
        )}
        {step < 2 && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !accountValid}
          >
            Continuar
          </button>
        )}
        {step === 2 && (
          <>
            <button type="button" className={styles.secondary} onClick={() => void handleTest()} disabled={busy !== null}>
              {busy === 'test' ? <Loader2 size={16} className={styles.spin} /> : <PlugZap size={16} />}
              Testar
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void handleActivate()}
              disabled={!testedCurrent || busy !== null}
              title={testedCurrent ? undefined : 'Teste a conta antes de ativar.'}
            >
              {busy === 'save' ? <Loader2 size={16} className={styles.spin} /> : <CheckCircle2 size={16} />}
              Ativar
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

// ── Opções avançadas ───────────────────────────────────────
interface AdvancedProps {
  overview: EmailOverview;
  status: EmailStatus | null;
  presets: ProviderPreset[];
  onChanged: (message: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

function AdvancedOptions({ overview, status, presets, onChanged, onDirtyChange }: AdvancedProps) {
  const own = overview.own_account;
  const ownActive = Boolean(own?.is_active);
  const ownError = Boolean(ownActive && (status?.own_account_error || own?.last_test_ok === false));
  const [open, setOpen] = useState(ownError);
  const [wizard, setWizard] = useState(false);
  const [confirmSystem, setConfirmSystem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conta própria com erro: abre sozinho para o admin ver o problema.
  useEffect(() => { if (ownError) setOpen(true); }, [ownError]);

  const ownEmail = own?.from_email || own?.username || '';
  const summary = ownActive ? `Enviando por ${ownEmail}` : 'Enviando pelo e-mail do sistema';
  const presetName = presets.find(p => p.id === own?.preset)?.name;

  async function useSystem() {
    if (!own) return;
    setBusy(true);
    setError(null);
    try {
      await saveEmailAccount(
        own.id,
        {
          preset: own.preset ?? 'other',
          host: own.host ?? '',
          port: own.port,
          security: own.security,
          username: own.username ?? '',
          secret: '',
          from_email: own.from_email ?? '',
          is_active: false,
        },
        own.version,
      );
      setConfirmSystem(false);
      onChanged('Pronto. Os e-mails voltaram a sair pelo e-mail do sistema.');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível trocar agora.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      className={styles.advanced}
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={styles.advancedSummary}>
        <span>
          <strong>Opções avançadas</strong>
          <span className={styles.advancedLine}>
            {summary}
            {ownError && <span className={styles.badgeError}><AlertTriangle size={12} aria-hidden="true" /> Com problema</span>}
          </span>
        </span>
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </summary>

      <div className={styles.advancedBody}>
        {wizard ? (
          <AccountWizard
            overview={overview}
            presets={presets}
            onCancel={() => setWizard(false)}
            onDone={message => { setWizard(false); onChanged(message); }}
            onDirtyChange={onDirtyChange}
          />
        ) : ownActive ? (
          <>
            <div className={styles.accountBox}>
              <Mail size={20} aria-hidden="true" />
              <div>
                <p><strong>Usando o e-mail do escritório</strong></p>
                <p className={styles.cardHint}>
                  {ownEmail}{presetName ? ` · ${presetName}` : ''}
                </p>
                <p className={styles.cardHint}>Se esta conta falhar, o e-mail do sistema envia no lugar dela.</p>
              </div>
            </div>
            {status?.own_account_error && <p className={styles.msgError}>{status.own_account_error}</p>}
            {own?.warnings.map(w => (
              <p key={w} className={styles.msgWarn}><AlertTriangle size={15} aria-hidden="true" /> {w}</p>
            ))}
            {error && <p className={styles.msgError} role="alert">{error}</p>}
            <footer className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => setConfirmSystem(true)}>
                Voltar a usar o e-mail do sistema
              </button>
              <button type="button" className={styles.primary} onClick={() => setWizard(true)}>
                Trocar conta
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className={styles.accountBox}>
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <p><strong>Usando o e-mail do sistema</strong></p>
                <p className={styles.cardHint}>
                  Já funciona sem configurar nada. Se preferir que os e-mails saiam pelo endereço do escritório, conecte o seu e-mail.
                </p>
              </div>
            </div>
            <footer className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => setWizard(true)} disabled={!own}>
                Usar meu próprio e-mail
              </button>
            </footer>
          </>
        )}
      </div>

      {confirmSystem && (
        <Modal title="Voltar ao e-mail do sistema?" onClose={() => setConfirmSystem(false)} width={440}>
          <p className={styles.modalText}>
            Os próximos e-mails vão sair pelo e-mail do sistema. A sua conta continua salva e pode ser reativada depois.
          </p>
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondary} onClick={() => setConfirmSystem(false)}>Cancelar</button>
            <button type="button" className={styles.primary} onClick={() => void useSystem()} disabled={busy}>
              {busy && <Loader2 size={16} className={styles.spin} />} Confirmar
            </button>
          </div>
        </Modal>
      )}
    </details>
  );
}

// ── Página ─────────────────────────────────────────────────
export default function ConfiguracoesEmail() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<EmailOverview | null>(null);
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState<{ identity: boolean; wizard: boolean }>({ identity: false, wizard: false });
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    getEmailStatus().then(setStatus).catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [ov, st, ps] = await Promise.all([getEmailOverview(), getEmailStatus(), listEmailPresets()]);
      setOverview(ov);
      setStatus(st);
      setPresets(ps);
    } catch {
      setError('Não foi possível carregar o e-mail do escritório.');
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const setIdentityDirty = useCallback((value: boolean) => {
    setDirty(d => (d.identity === value ? d : { ...d, identity: value }));
  }, []);
  const setWizardDirty = useCallback((value: boolean) => {
    setDirty(d => (d.wizard === value ? d : { ...d, wizard: value }));
  }, []);
  const hasUnsaved = dirty.identity || dirty.wizard;

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

  function handleChanged(message: string) {
    setNotice(message);
    void loadAll();
  }

  const senderEmail = status?.account_email ?? overview?.system_account_email ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Comunicação</p>
        <h1>E-mail do escritório</h1>
        <p className={styles.subtitle}>
          Com que nome os e-mails do sistema chegam aos clientes e se eles estão sendo entregues.
        </p>
      </header>

      {error && <p className={styles.msgError}>{error}</p>}
      {notice && <p className={styles.msgOk} role="status">{notice}</p>}

      {!overview ? (
        <div className={styles.cards} aria-hidden="true">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      ) : (
        <>
          <div className={styles.cards}>
            <StatusCard status={status} onSent={loadStatus} />
            <IdentityCard
              overview={overview}
              senderEmail={senderEmail}
              onSaved={() => { void loadAll(); }}
              onDirtyChange={setIdentityDirty}
            />
          </div>
          <AdvancedOptions
            overview={overview}
            status={status}
            presets={presets}
            onChanged={handleChanged}
            onDirtyChange={setWizardDirty}
          />
        </>
      )}

      {pendingHref && (
        <Modal title="Sair sem salvar?" onClose={() => setPendingHref(null)} width={420}>
          <p className={styles.modalText}>Há alterações não salvas no e-mail do escritório. Se sair agora, elas serão perdidas.</p>
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondary} onClick={() => setPendingHref(null)}>
              Continuar editando
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                const href = pendingHref;
                setDirty({ identity: false, wizard: false });
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
