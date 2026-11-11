import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Ban, CheckCircle2, ChevronLeft, ChevronRight, Clock, Hourglass,
  Loader2, MailX, RefreshCw, RotateCcw, Search, Send, ServerCrash, X, XCircle,
} from 'lucide-react';
import {
  BREAKER_LABEL, EMAIL_STATUS_LABEL,
  cancelEmail, getEmailHealth, getEmailLog, listEmailLogs, listEmailTypes,
  resendEmail, resendEmails,
  type EmailHealth, type EmailLog, type EmailLogDetail, type EmailStatus, type EmailType,
} from '../../../services/emailLogs';
import { ApiError } from '../../../services/api';
import styles from './EmailLogs.module.css';

const LIMIT = 20;

type Periodo = 'MES' | 'HOJE' | '7D' | '30D' | 'MES_PASSADO' | 'TUDO' | 'LIVRE';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'MES', label: 'Mês atual' },
  { value: 'HOJE', label: 'Hoje' },
  { value: '7D', label: 'Últimos 7 dias' },
  { value: '30D', label: 'Últimos 30 dias' },
  { value: 'MES_PASSADO', label: 'Mês passado' },
  { value: 'TUDO', label: 'Todo o período' },
  { value: 'LIVRE', label: 'Datas livres' },
];

const STATUS_OPTIONS: EmailStatus[] = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'DEAD', 'CANCELLED'];

const STATUS_ICON: Record<EmailStatus, typeof CheckCircle2> = {
  PENDING: Clock,
  SENDING: Loader2,
  SENT: CheckCircle2,
  FAILED: RotateCcw,
  DEAD: XCircle,
  CANCELLED: Ban,
};

// Contas da cadeia de envio (nomes do backend).
const PROVIDER_LABEL: Record<string, string> = {
  own: 'E-mail do escritório',
  system: 'E-mail do sistema',
};

function providerLabel(name: string | null): string {
  return name ? PROVIDER_LABEL[name] ?? name : '';
}

const RELATED_LABEL: Record<string, string> = {
  payment: 'Vencimento',
  user: 'Usuário',
};

// ── Helpers ────────────────────────────────────────────────
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function periodRange(periodo: Periodo, livre: { inicio: string; fim: string }): { inicio?: string; fim?: string } {
  const hoje = new Date();
  switch (periodo) {
    case 'MES':
      return { inicio: ymd(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: ymd(hoje) };
    case 'HOJE':
      return { inicio: ymd(hoje), fim: ymd(hoje) };
    case '7D':
      return { inicio: ymd(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6)), fim: ymd(hoje) };
    case '30D':
      return { inicio: ymd(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29)), fim: ymd(hoje) };
    case 'MES_PASSADO':
      return {
        inicio: ymd(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
        fim: ymd(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
      };
    case 'TUDO':
      return {};
    case 'LIVRE':
      return { inicio: livre.inicio || undefined, fim: livre.fim || undefined };
  }
}

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function formatDateTime(value: string | null): string {
  return value ? DATE_TIME.format(new Date(value)) : '';
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Sem envios';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1).replace('.', ',')} h`;
}

function minutesSince(value: string | null): number | null {
  if (!value) return null;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Não foi possível concluir a operação.';
}

function StatusBadge({ status }: { status: EmailStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`${styles.badge} ${styles[`badge${status}`]}`}>
      <Icon size={13} aria-hidden="true" className={status === 'SENDING' ? styles.spinning : ''} />
      {EMAIL_STATUS_LABEL[status]}
    </span>
  );
}

// ── Painel de saúde ────────────────────────────────────────
function HealthSkeleton() {
  return (
    <div className={styles.cards} aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={styles.card}>
          <span className={`${styles.skel} ${styles.skelLabel}`} />
          <span className={`${styles.skel} ${styles.skelValue}`} />
          <span className={`${styles.skel} ${styles.skelLabel}`} />
        </div>
      ))}
    </div>
  );
}

function HealthPanel({ health }: { health: EmailHealth }) {
  const espera = minutesSince(health.oldest_pending_at);
  const taxa = health.success_rate_24h === null ? null : Math.round(health.success_rate_24h * 1000) / 10;

  return (
    <div className={styles.cards}>
      <div className={`${styles.card} ${styles.reveal}`}>
        <span className={styles.cardLabel}><Hourglass size={14} aria-hidden="true" /> Fila pendente</span>
        <strong className={styles.cardValue}>{health.queue_pending}</strong>
        <span className={styles.cardHint}>
          {espera === null ? 'Nenhum e-mail aguardando' : `Mais antigo aguarda há ${espera} min`}
        </span>
      </div>
      <div className={`${styles.card} ${styles.reveal}`} style={{ animationDelay: '40ms' }}>
        <span className={styles.cardLabel}><CheckCircle2 size={14} aria-hidden="true" /> Sucesso em 24 h</span>
        <strong className={styles.cardValue}>{taxa === null ? 'Sem envios' : `${String(taxa).replace('.', ',')}%`}</strong>
        <span className={styles.cardHint}>{health.sent_24h} enviados, {health.dead_24h} não entregues</span>
      </div>
      <div className={`${styles.card} ${styles.reveal}`} style={{ animationDelay: '80ms' }}>
        <span className={styles.cardLabel}><Send size={14} aria-hidden="true" /> Tempo médio de entrega</span>
        <strong className={styles.cardValue}>{formatDuration(health.avg_delivery_seconds_24h)}</strong>
        <span className={styles.cardHint}>Da entrada na fila até o envio, últimas 24 h</span>
      </div>
      <div className={`${styles.card} ${styles.reveal}`} style={{ animationDelay: '120ms' }}>
        <span className={styles.cardLabel}><ServerCrash size={14} aria-hidden="true" /> Provedores</span>
        {health.providers.length === 0 ? (
          <span className={styles.cardHint}>Nenhum envio registrado ainda</span>
        ) : (
          <ul className={styles.providers}>
            {health.providers.map(p => (
              <li key={p.provider}>
                <span className={styles.providerName}>{providerLabel(p.provider)}</span>
                <span className={`${styles.breaker} ${styles[`breaker${p.state}`]}`}>
                  {p.state === 'CLOSED' ? <CheckCircle2 size={12} aria-hidden="true" /> : <AlertTriangle size={12} aria-hidden="true" />}
                  {BREAKER_LABEL[p.state]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DailyChart({ health }: { health: EmailHealth }) {
  const max = Math.max(1, ...health.daily.map(d => d.sent + d.failed + d.dead));
  const total = health.daily.reduce(
    (acc, d) => ({ sent: acc.sent + d.sent, failed: acc.failed + d.failed, dead: acc.dead + d.dead }),
    { sent: 0, failed: 0, dead: 0 },
  );
  const resumo = `Últimos 30 dias: ${total.sent} enviados, ${total.failed} em nova tentativa, ${total.dead} não entregues.`;

  return (
    <section className={`${styles.chartPanel} ${styles.reveal}`} style={{ animationDelay: '160ms' }}>
      <div className={styles.chartHeader}>
        <h2>Envios por dia</h2>
        <ul className={styles.legend}>
          <li><span className={`${styles.swatch} ${styles.swatchSent}`} /> Enviados</li>
          <li><span className={`${styles.swatch} ${styles.swatchFailed}`} /> Nova tentativa</li>
          <li><span className={`${styles.swatch} ${styles.swatchDead}`} /> Não entregues</li>
        </ul>
      </div>
      {total.sent + total.failed + total.dead === 0 ? (
        <p className={styles.chartEmpty}>Nenhum e-mail nos últimos 30 dias.</p>
      ) : (
        <div className={styles.chart} role="img" aria-label={resumo}>
          {health.daily.map(d => {
            const soma = d.sent + d.failed + d.dead;
            const [, m, dia] = d.day.split('-');
            return (
              <div
                key={d.day}
                className={styles.bar}
                title={`${dia}/${m}: ${d.sent} enviados, ${d.failed} em nova tentativa, ${d.dead} não entregues`}
              >
                <div className={styles.barStack} style={{ height: `${(soma / max) * 100}%` }}>
                  {d.dead > 0 && <span className={styles.segDead} style={{ flexGrow: d.dead }} />}
                  {d.failed > 0 && <span className={styles.segFailed} style={{ flexGrow: d.failed }} />}
                  {d.sent > 0 && <span className={styles.segSent} style={{ flexGrow: d.sent }} />}
                </div>
                <span className={styles.barLabel}>{dia}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className={styles.srOnly}>{resumo}</p>
    </section>
  );
}

// ── Gaveta de detalhe ──────────────────────────────────────
interface DrawerProps {
  emailId: string;
  onClose: () => void;
  onChanged: (message: string) => void;
}

function EmailDrawer({ emailId, onClose, onChanged }: DrawerProps) {
  const [detail, setDetail] = useState<EmailLogDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError('');
    getEmailLog(emailId)
      .then(data => { if (active) setDetail(data); })
      .catch(e => { if (active) setError(errMsg(e)); });
    return () => { active = false; };
  }, [emailId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function act(action: 'resend' | 'cancel') {
    if (!detail) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'resend') {
        await resendEmail(detail.id);
        onChanged('Cópia do e-mail adicionada à fila.');
      } else {
        await cancelEmail(detail.id);
        onChanged('E-mail cancelado.');
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const cancelavel = detail && (detail.status === 'PENDING' || detail.status === 'FAILED');

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <aside
        className={styles.drawer}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhe do e-mail"
      >
        <header className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>
            <span className={styles.eyebrow}>{detail?.template_name ?? 'E-mail'}</span>
            <h2>{detail?.subject ?? (detail ? 'Assunto definido no envio' : 'Carregando')}</h2>
          </div>
          <button ref={closeRef} className={styles.iconButton} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className={styles.drawerBody}>
          {error && <p className={styles.formError} role="alert">{error}</p>}

          {!detail && !error && (
            <div aria-hidden="true" className={styles.drawerSkeleton}>
              <span className={`${styles.skel} ${styles.skelLine}`} />
              <span className={`${styles.skel} ${styles.skelLine}`} />
              <span className={`${styles.skel} ${styles.skelBlock}`} />
            </div>
          )}

          {detail && (
            <>
              <dl className={styles.meta}>
                <div><dt>Situação</dt><dd><StatusBadge status={detail.status} /></dd></div>
                <div><dt>Para</dt><dd>{detail.to.join(', ')}</dd></div>
                {detail.cc.length > 0 && <div><dt>Cópia</dt><dd>{detail.cc.join(', ')}</dd></div>}
                <div><dt>Criado em</dt><dd>{formatDateTime(detail.created_at)}</dd></div>
                {detail.sent_at && <div><dt>Enviado em</dt><dd>{formatDateTime(detail.sent_at)}</dd></div>}
                {detail.status === 'FAILED' && (
                  <div><dt>Próxima tentativa</dt><dd>{formatDateTime(detail.next_attempt_at)}</dd></div>
                )}
                {detail.provider && <div><dt>Enviado por</dt><dd>{providerLabel(detail.provider)}</dd></div>}
                {detail.related_type && detail.related_id !== null && (
                  <div><dt>Origem</dt><dd>{RELATED_LABEL[detail.related_type] ?? detail.related_type} #{detail.related_id}</dd></div>
                )}
                {detail.resent_from_id && <div><dt>Reenvio de</dt><dd className={styles.mono}>{detail.resent_from_id.slice(0, 8)}</dd></div>}
              </dl>

              {(detail.resendable || cancelavel) && (
                <div className={styles.drawerActions}>
                  {detail.resendable && (
                    <button className={styles.btnPrimary} onClick={() => void act('resend')} disabled={busy}>
                      <RotateCcw size={15} /> Reenviar
                    </button>
                  )}
                  {cancelavel && (
                    <button className={styles.btnDangerGhost} onClick={() => void act('cancel')} disabled={busy}>
                      <Ban size={15} /> Cancelar envio
                    </button>
                  )}
                </div>
              )}
              {!detail.resendable && ['user_invite', 'password_reset'].includes(detail.template_id) && (
                <p className={styles.note}>
                  Convite e redefinição de senha têm link de uso único. Para mandar de novo, gere um novo pela tela de usuários ou pelo login.
                </p>
              )}

              <section>
                <h3 className={styles.sectionTitle}>Tentativas</h3>
                {detail.timeline.length === 0 ? (
                  <p className={styles.note}>Nenhuma tentativa ainda. O envio acontece em até 30 segundos.</p>
                ) : (
                  <ol className={styles.timeline}>
                    {detail.timeline.map(a => (
                      <li key={a.attempt} className={a.success ? styles.tlOk : styles.tlFail}>
                        <span className={styles.tlDot} aria-hidden="true">
                          {a.success ? <CheckCircle2 size={14} /> : <MailX size={14} />}
                        </span>
                        <div>
                          <strong>Tentativa {a.attempt}: {a.success ? 'entregue' : 'falhou'}</strong>
                          <span className={styles.tlMeta}>
                            {formatDateTime(a.created_at)}
                            {a.provider && ` · ${providerLabel(a.provider)}`}
                            {a.duration_ms !== null && ` · ${a.duration_ms} ms`}
                          </span>
                          {a.error && <span className={styles.tlError}>{a.error}</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <h3 className={styles.sectionTitle}>Pré-visualização</h3>
                {detail.html ? (
                  <iframe
                    className={styles.preview}
                    title="Pré-visualização do e-mail"
                    sandbox=""
                    srcDoc={detail.html}
                  />
                ) : (
                  <p className={styles.note}>
                    {detail.status === 'PENDING'
                      ? 'O conteúdo é montado no momento do envio.'
                      : 'Conteúdo removido pela política de retenção; os dados do envio continuam registrados.'}
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────
export default function EmailLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const relatedType = searchParams.get('related_type') ?? '';
  const relatedId = searchParams.get('related_id') ?? '';
  const temOrigem = Boolean(relatedType && relatedId);

  // Vindo de um vencimento ou cliente, o período não pode esconder o histórico.
  const [periodo, setPeriodo] = useState<Periodo>(
    temOrigem || searchParams.get('busca') ? 'TUDO' : 'MES',
  );
  const [livre, setLivre] = useState({ inicio: '', fim: '' });
  const [status, setStatus] = useState<EmailStatus | ''>(
    (searchParams.get('status') as EmailStatus | null) ?? '',
  );
  const [tipo, setTipo] = useState('');
  const [buscaInput, setBuscaInput] = useState(searchParams.get('busca') ?? '');
  const [busca, setBusca] = useState(buscaInput);
  const [page, setPage] = useState(1);

  const [types, setTypes] = useState<EmailType[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<EmailHealth | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => { setBusca(buscaInput.trim()); setPage(1); }, 400);
    return () => window.clearTimeout(t);
  }, [buscaInput]);

  useEffect(() => {
    listEmailTypes().then(setTypes).catch(() => {});
  }, []);

  const range = useMemo(() => periodRange(periodo, livre), [periodo, livre]);
  const periodoInvalido = Boolean(range.inicio && range.fim && range.inicio > range.fim);

  const showFeedback = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setFeedback({ message, kind });
    window.setTimeout(() => setFeedback(null), 5000);
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await getEmailHealth());
    } catch {
      showFeedback('Não foi possível carregar a saúde do envio.', 'error');
    }
  }, [showFeedback]);

  const loadLogs = useCallback(async () => {
    if (periodoInvalido) return;
    setLoading(true);
    try {
      const res = await listEmailLogs({
        ...range,
        status: status || undefined,
        tipo: tipo || undefined,
        busca: busca || undefined,
        related_type: temOrigem ? relatedType : undefined,
        related_id: temOrigem ? Number(relatedId) : undefined,
        page,
        limit: LIMIT,
      });
      setLogs(res.data);
      setTotal(res.meta.total);
      setPages(res.meta.pages);
    } catch (e) {
      showFeedback(errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [range, status, tipo, busca, page, temOrigem, relatedType, relatedId, periodoInvalido, showFeedback]);

  useEffect(() => { void loadHealth(); }, [loadHealth]);
  useEffect(() => { void loadLogs(); }, [loadLogs]);
  useEffect(() => { setSelected(new Set()); }, [logs]);

  function refreshAll() {
    void loadHealth();
    void loadLogs();
  }

  function limparOrigem() {
    const next = new URLSearchParams(searchParams);
    next.delete('related_type');
    next.delete('related_id');
    setSearchParams(next, { replace: true });
    setPage(1);
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selecionaveis = logs.filter(l => l.resendable);
  const todosMarcados = selecionaveis.length > 0 && selecionaveis.every(l => selected.has(l.id));

  async function reenviarSelecionados() {
    setBatchBusy(true);
    try {
      const result = await resendEmails([...selected]);
      const pulados = result.skipped.length ? `, ${result.skipped.length} ignorado(s)` : '';
      showFeedback(`${result.resent.length} e-mail(s) adicionados à fila${pulados}.`, result.skipped.length ? 'error' : 'success');
      refreshAll();
    } catch (e) {
      showFeedback(errMsg(e), 'error');
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      {feedback && (
        <div
          className={`${styles.toast} ${feedback.kind === 'error' ? styles.toastError : styles.toastSuccess}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      )}

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Envio de e-mail</p>
          <h1>E-mails</h1>
          <p className={styles.subtitle}>Tudo o que o sistema enviou ou tentou enviar, com a saúde do envio.</p>
        </div>
        <button className={styles.btnOutline} onClick={refreshAll} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spinning : ''} /> Atualizar
        </button>
      </header>

      {health && health.alerts.length > 0 && (
        <div className={styles.alerts} role="alert">
          {health.alerts.map(a => (
            <p key={a.kind} className={a.level === 'critical' ? styles.alertCritical : styles.alertWarning}>
              <AlertTriangle size={16} aria-hidden="true" /> {a.message}
            </p>
          ))}
        </div>
      )}

      {health ? <HealthPanel health={health} /> : <HealthSkeleton />}
      {health ? <DailyChart health={health} /> : <div className={`${styles.chartPanel} ${styles.skel} ${styles.skelChart}`} aria-hidden="true" />}

      <section className={styles.panel}>
        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Buscar por destinatário ou assunto</span>
            <input
              type="search"
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              placeholder="Destinatário ou assunto"
            />
          </label>
          <label className={styles.filterField}>
            <span className={styles.srOnly}>Período</span>
            <select value={periodo} onChange={e => { setPeriodo(e.target.value as Periodo); setPage(1); }}>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          {periodo === 'LIVRE' && (
            <>
              <label className={styles.filterField}>
                <span className={styles.srOnly}>Data inicial</span>
                <input type="date" value={livre.inicio} onChange={e => { setLivre(v => ({ ...v, inicio: e.target.value })); setPage(1); }} />
              </label>
              <label className={styles.filterField}>
                <span className={styles.srOnly}>Data final</span>
                <input type="date" value={livre.fim} onChange={e => { setLivre(v => ({ ...v, fim: e.target.value })); setPage(1); }} />
              </label>
            </>
          )}
          <label className={styles.filterField}>
            <span className={styles.srOnly}>Situação</span>
            <select value={status} onChange={e => { setStatus(e.target.value as EmailStatus | ''); setPage(1); }}>
              <option value="">Todas as situações</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{EMAIL_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span className={styles.srOnly}>Tipo</span>
            <select value={tipo} onChange={e => { setTipo(e.target.value); setPage(1); }}>
              <option value="">Todos os tipos</option>
              <option value="notification">Notificações internas</option>
              {types.filter(t => !t.id.startsWith('notification.')).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        </div>

        {periodoInvalido && <p className={styles.filterError} role="alert">A data inicial não pode ser maior que a data final.</p>}

        {temOrigem && (
          <div className={styles.originChip}>
            Filtrando por {RELATED_LABEL[relatedType] ?? relatedType} #{relatedId}
            <button onClick={limparOrigem} aria-label="Remover filtro de origem"><X size={14} /></button>
          </div>
        )}

        {selected.size > 0 && (
          <div className={styles.batchBar}>
            <span>{selected.size} selecionado(s)</span>
            <button className={styles.btnPrimary} onClick={() => void reenviarSelecionados()} disabled={batchBusy}>
              <RotateCcw size={15} /> {batchBusy ? 'Reenviando...' : 'Reenviar selecionados'}
            </button>
          </div>
        )}

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol}>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos os e-mails que podem ser reenviados"
                    checked={todosMarcados}
                    disabled={selecionaveis.length === 0}
                    onChange={() => setSelected(todosMarcados ? new Set() : new Set(selecionaveis.map(l => l.id)))}
                  />
                </th>
                <th>Situação</th>
                <th>Tipo</th>
                <th>Destinatário</th>
                <th>Assunto</th>
                <th>Tentativas</th>
                <th>Criado em</th>
                <th>Enviado em</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }, (_, i) => (
                <tr key={`sk${i}`} aria-hidden="true">
                  {Array.from({ length: 8 }, (__, j) => (
                    <td key={j}><span className={`${styles.skel} ${styles.skelCell}`} /></td>
                  ))}
                </tr>
              ))}
              {!loading && logs.map(log => (
                <tr
                  key={log.id}
                  className={`${styles.row} ${log.status === 'DEAD' ? styles.rowDead : ''}`}
                  onClick={() => setOpenId(log.id)}
                >
                  <td className={styles.checkCol} onClick={e => e.stopPropagation()}>
                    {log.resendable && (
                      <input
                        type="checkbox"
                        aria-label={`Selecionar e-mail para ${log.to.join(', ')}`}
                        checked={selected.has(log.id)}
                        onChange={() => toggle(log.id)}
                      />
                    )}
                  </td>
                  <td><StatusBadge status={log.status} /></td>
                  <td className={styles.typeCell}>{log.template_name}</td>
                  <td className={styles.toCell}>{log.to.join(', ')}</td>
                  <td className={styles.subjectCell}>
                    <button className={styles.linkButton} onClick={e => { e.stopPropagation(); setOpenId(log.id); }}>
                      {log.subject ?? 'Na fila para envio'}
                    </button>
                    {log.last_error && log.status !== 'SENT' && <span className={styles.errorLine}>{log.last_error}</span>}
                  </td>
                  <td className={styles.numCell}>{log.attempts}</td>
                  <td className={styles.dateCell}>{formatDateTime(log.created_at)}</td>
                  <td className={styles.dateCell}>{log.sent_at ? formatDateTime(log.sent_at) : <span className={styles.dash}>Não enviado</span>}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.empty}>Nenhum e-mail encontrado com esses filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <span>Mostrando <strong>{logs.length}</strong> de <strong>{total}</strong> e-mail(s)</span>
          <div className={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Página anterior">
              <ChevronLeft size={16} />
            </button>
            <span>Página {page} de {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} aria-label="Próxima página">
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {openId && (
        <EmailDrawer
          emailId={openId}
          onClose={() => setOpenId(null)}
          onChanged={message => { setOpenId(null); showFeedback(message); refreshAll(); }}
        />
      )}
    </div>
  );
}
