import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2,
  AlertTriangle, CalendarClock, CheckCircle2, Wallet,
} from 'lucide-react';
import {
  listPayments, createPayment, updatePayment, deletePayment,
  paymentSituation, paymentAmount, formatBRL,
  SITUATION_LABEL, SITUATION_COLOR,
  type Payment, type PaymentWrite, type PaymentSituation,
} from '../../../services/payments';
import { listClients, type ClientListItem } from '../../../services/clients';
import { ApiError } from '../../../services/api';
import styles from './Pagamentos.module.css';

// ── Constants ──────────────────────────────────────────────
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_HEADER = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
const CHIPS_POR_CELULA = 3;

type Filtro = 'TODOS' | PaymentSituation;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'TODOS',    label: 'Todos' },
  { value: 'VENCIDO',  label: 'Pendentes' },
  { value: 'HOJE',     label: 'Vencem hoje' },
  { value: 'A_VENCER', label: 'A vencer' },
];

// ── Helpers ────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function localYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatarData(ymd: string) {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Não foi possível concluir a operação.';
}
function parseValor(raw: string): number | null {
  const limpo = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── Form ───────────────────────────────────────────────────
type FormState = {
  client_id: number | null;
  payment_date: string;
  amount: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  client_id: null,
  payment_date: '',
  amount: '',
  description: '',
};

function paymentToForm(p: Payment): FormState {
  const valor = paymentAmount(p.amount);
  return {
    client_id: p.client_id,
    payment_date: p.payment_date,
    amount: valor ? valor.toFixed(2).replace('.', ',') : '',
    description: p.description ?? '',
  };
}

function formToPayload(form: FormState): PaymentWrite {
  return {
    client_id: form.client_id as number,
    payment_date: form.payment_date,
    amount: parseValor(form.amount),
    description: form.description.trim() || null,
  };
}

// ── Modal de cadastro / edição ─────────────────────────────
interface VencimentoModalProps {
  titulo: string;
  initial: FormState;
  clients: ClientListItem[];
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: (form: FormState) => void;
  onDelete?: () => void;
}

function VencimentoModal({
  titulo, initial, clients, saving, error, onCancel, onSave, onDelete,
}: VencimentoModalProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onCancel]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const valorInvalido = form.amount.trim() !== '' && parseValor(form.amount) === null;
  const valid = Boolean(form.client_id) && Boolean(form.payment_date) && !valorInvalido;

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{titulo}</h2>
          <button className={styles.modalClose} onClick={onCancel} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form
          className={styles.modalBody}
          onSubmit={e => { e.preventDefault(); if (valid && !saving) onSave(form); }}
        >
          {error && <p className={styles.formError} role="alert">{error}</p>}

          <div className={styles.mField}>
            <label className={styles.mLabel} htmlFor="pg-cliente">CLIENTE *</label>
            <select
              id="pg-cliente"
              className={styles.mSelect}
              value={form.client_id ?? ''}
              onChange={e => update('client_id', e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="">Selecione o cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className={styles.mHelp}>O vencimento fica vinculado a este cliente.</span>
          </div>

          <div className={styles.mRow2}>
            <div className={styles.mField}>
              <label className={styles.mLabel} htmlFor="pg-data">DATA DE VENCIMENTO *</label>
              <input
                id="pg-data"
                type="date"
                className={styles.mInput}
                value={form.payment_date}
                onChange={e => update('payment_date', e.target.value)}
                required
              />
            </div>
            <div className={styles.mField}>
              <label className={styles.mLabel} htmlFor="pg-valor">VALOR (R$)</label>
              <input
                id="pg-valor"
                className={styles.mInput}
                inputMode="decimal"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                placeholder="1.500,00"
                aria-invalid={valorInvalido}
              />
              {valorInvalido
                ? <span className={styles.mError}>Informe um valor válido, ex: 1.500,00.</span>
                : <span className={styles.mHelp}>Opcional.</span>}
            </div>
          </div>

          <div className={styles.mField}>
            <label className={styles.mLabel} htmlFor="pg-desc">DESCRIÇÃO</label>
            <textarea
              id="pg-desc"
              className={styles.mTextarea}
              rows={3}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Ex: 2ª parcela dos honorários contratuais"
            />
          </div>

          <div className={styles.modalFooter}>
            {onDelete && (
              confirmando ? (
                <div className={styles.confirmBox}>
                  <span className={styles.confirmText}>Excluir este vencimento?</span>
                  <button type="button" className={styles.btnGhost} onClick={() => setConfirmando(false)}>
                    Cancelar
                  </button>
                  <button type="button" className={styles.btnDanger} onClick={onDelete} disabled={saving}>
                    Confirmar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.btnDangerGhost}
                  onClick={() => setConfirmando(true)}
                  disabled={saving}
                >
                  <Trash2 size={15} /> Excluir
                </button>
              )
            )}
            <div className={styles.footerRight}>
              <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancelar</button>
              <button type="submit" className={styles.btnPrimary} disabled={!valid || saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sheet do dia (mobile) ──────────────────────────────────
interface DaySheetProps {
  date: string;
  payments: Payment[];
  clientName: (id: number) => string;
  todayYMD: string;
  onClose: () => void;
  onEdit: (p: Payment) => void;
  onNew: (date: string) => void;
}

function DaySheet({ date, payments, clientName, todayYMD, onClose, onEdit, onNew }: DaySheetProps) {
  return (
    <div className={styles.overlayBottom} onClick={onClose} role="presentation">
      <div className={styles.daySheet} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.daySheetHandle} />
        <div className={styles.daySheetHeader}>
          <span className={styles.daySheetDate}>{formatarData(date)}</span>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className={styles.daySheetList}>
          {payments.map(p => {
            const sit = paymentSituation(p.payment_date, todayYMD);
            return (
              <button key={p.id} className={styles.daySheetItem} onClick={() => onEdit(p)}>
                <span
                  className={styles.daySheetBadge}
                  style={{ color: SITUATION_COLOR[sit], background: `${SITUATION_COLOR[sit]}18` }}
                >
                  {SITUATION_LABEL[sit]}
                </span>
                <span className={styles.daySheetName}>{clientName(p.client_id)}</span>
                <span className={styles.daySheetValue}>{formatBRL(paymentAmount(p.amount))}</span>
              </button>
            );
          })}
        </div>
        <button className={styles.daySheetAdd} onClick={() => onNew(date)}>
          <Plus size={16} /> Novo vencimento neste dia
        </button>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div className={styles.calGrid} aria-hidden="true">
      {Array.from({ length: 35 }, (_, i) => (
        <div key={i} className={styles.calCell}>
          <span className={`${styles.skel} ${styles.skelDay}`} />
          {i % 4 === 0 && <span className={`${styles.skel} ${styles.skelChip}`} />}
          {i % 7 === 2 && <span className={`${styles.skel} ${styles.skelChip}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────
type ModalState =
  | { kind: 'novo'; date: string }
  | { kind: 'editar'; payment: Payment }
  | null;

export default function Pagamentos() {
  const today = useMemo(() => new Date(), []);
  const todayYMD = localYMD(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const [modal, setModal] = useState<ModalState>(null);
  const [daySheet, setDaySheet] = useState<{ date: string; payments: Payment[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setPageError('');
    try {
      const start = toYMD(y, m, 1);
      const end = toYMD(y, m, getDaysInMonth(y, m));
      const [paymentList, clientRes] = await Promise.all([
        listPayments({ start_date: start, end_date: end }),
        listClients({ limit: 100 }),
      ]);
      setPayments(paymentList);
      setClients(clientRes.data);
    } catch {
      setPageError('Não foi possível carregar os pagamentos deste mês.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMonth(year, month); }, [year, month, loadMonth]);

  const clientName = useCallback(
    (id: number) => clients.find(c => c.id === id)?.name ?? `Cliente #${id}`,
    [clients],
  );

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function irParaHoje() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const visiveis = useMemo(
    () => filtro === 'TODOS'
      ? payments
      : payments.filter(p => paymentSituation(p.payment_date, todayYMD) === filtro),
    [payments, filtro, todayYMD],
  );

  const resumo = useMemo(() => {
    const base = {
      total:    { qtd: 0, valor: 0 },
      VENCIDO:  { qtd: 0, valor: 0 },
      HOJE:     { qtd: 0, valor: 0 },
      A_VENCER: { qtd: 0, valor: 0 },
    };
    for (const p of payments) {
      const valor = paymentAmount(p.amount);
      const sit = paymentSituation(p.payment_date, todayYMD);
      base.total.qtd += 1;
      base.total.valor += valor;
      base[sit].qtd += 1;
      base[sit].valor += valor;
    }
    return base;
  }, [payments, todayYMD]);

  async function handleSave(form: FormState) {
    setSaving(true);
    setFormError('');
    try {
      if (modal?.kind === 'editar') {
        const updated = await updatePayment(modal.payment.id, formToPayload(form));
        setPayments(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createPayment(formToPayload(form));
        const dentroDoMes = created.payment_date.startsWith(
          `${year}-${String(month + 1).padStart(2, '0')}`,
        );
        if (dentroDoMes) setPayments(prev => [...prev, created]);
      }
      setModal(null);
      setDaySheet(null);
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (modal?.kind !== 'editar') return;
    setSaving(true);
    setFormError('');
    try {
      await deletePayment(modal.payment.id);
      setPayments(prev => prev.filter(p => p.id !== modal.payment.id));
      setModal(null);
      setDaySheet(null);
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  function abrirDia(ymd: string, doDia: Payment[]) {
    if (doDia.length > 0 && window.innerWidth <= 640) {
      setDaySheet({ date: ymd, payments: doDia });
      return;
    }
    setFormError('');
    setModal({ kind: 'novo', date: ymd });
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;

  const cards = [
    { key: 'total',    label: 'Total do mês', icon: Wallet,        dado: resumo.total,    cor: 'var(--navy)' },
    { key: 'VENCIDO',  label: 'Pendentes',    icon: AlertTriangle, dado: resumo.VENCIDO,  cor: SITUATION_COLOR.VENCIDO },
    { key: 'HOJE',     label: 'Vencem hoje',  icon: CalendarClock, dado: resumo.HOJE,     cor: SITUATION_COLOR.HOJE },
    { key: 'A_VENCER', label: 'A vencer',     icon: CheckCircle2,  dado: resumo.A_VENCER, cor: SITUATION_COLOR.A_VENCER },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Calendário de Pagamentos</h1>
          <p className={styles.pageSubtitle}>
            Vencimentos dos clientes no mês, com a situação de cada cobrança.
          </p>
        </div>
      </div>

      {pageError && <p className={styles.pageError} role="alert">{pageError}</p>}

      <div className={styles.resumo}>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`${styles.resumoCard} ${styles.reveal}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={styles.resumoIcon} style={{ color: card.cor, background: `${card.cor}14` }}>
                <Icon size={18} />
              </span>
              <div className={styles.resumoInfo}>
                <span className={styles.resumoLabel}>{card.label}</span>
                {loading ? (
                  <span className={`${styles.skel} ${styles.skelValor}`} />
                ) : (
                  <>
                    <span className={styles.resumoValor}>{formatBRL(card.dado.valor)}</span>
                    <span className={styles.resumoQtd}>
                      {card.dado.qtd} {card.dado.qtd === 1 ? 'vencimento' : 'vencimentos'}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
  <div className={styles.filtros} role="group" aria-label="Filtrar por situação">
    {FILTROS.map(f => (
      <button
        key={f.value}
        className={`${styles.filtroBtn} ${filtro === f.value ? styles.filtroAtivo : ''}`}
        onClick={() => setFiltro(f.value)}
        aria-pressed={filtro === f.value}
      >
        {f.label}
      </button>
    ))}
  </div>

  <div className={styles.headerRight} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
    <div className={styles.monthNav}>
      <button className={styles.monthBtn} onClick={prevMonth} aria-label="Mês anterior">
        <ChevronLeft size={16} />
      </button>
      <span className={styles.monthLabel}>{MESES[month]} {year}</span>
      <button className={styles.monthBtn} onClick={nextMonth} aria-label="Próximo mês">
        <ChevronRight size={16} />
      </button>
    </div>
    <button className={styles.btnSecondary} onClick={irParaHoje}>Hoje</button>
    <button
      className={styles.btnPrimary}
      onClick={() => { setFormError(''); setModal({ kind: 'novo', date: '' }); }}
    >
      <Plus size={16} /> Novo Vencimento
    </button>
  </div>
</div>

     

      <div className={`${styles.calendar} ${styles.reveal}`} style={{ animationDelay: '120ms' }}>
        <div className={styles.calHeader}>
          {DIAS_SEMANA_HEADER.map(d => (
            <div key={d} className={styles.calHeaderCell}>{d}</div>
          ))}
        </div>

        {loading ? <CalendarSkeleton /> : (
          <div className={styles.calGrid}>
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDayOfWeek + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const ymd = isValid ? toYMD(year, month, dayNum) : '';
              const isToday = ymd === todayYMD;
              const doDia = isValid ? visiveis.filter(p => p.payment_date === ymd) : [];

              return (
                <div
                  key={i}
                  className={`${styles.calCell} ${isToday ? styles.calCellToday : ''} ${!isValid ? styles.calCellEmpty : ''}`}
                  onClick={() => { if (isValid) abrirDia(ymd, doDia); }}
                  role={isValid ? 'button' : undefined}
                  tabIndex={isValid ? 0 : undefined}
                  aria-label={isValid ? `${formatarData(ymd)} — ${doDia.length} vencimento(s)` : undefined}
                  onKeyDown={e => {
                    if (!isValid) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDia(ymd, doDia); }
                  }}
                >
                  {isValid && (
                    <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{dayNum}</span>
                  )}

                  {doDia.slice(0, CHIPS_POR_CELULA).map(p => {
                    const sit = paymentSituation(p.payment_date, todayYMD);
                    const cor = SITUATION_COLOR[sit];
                    return (
                      <button
                        key={p.id}
                        className={styles.chip}
                        style={{ color: cor, background: `${cor}14`, borderLeft: `3px solid ${cor}` }}
                        title={`${clientName(p.client_id)} — ${formatBRL(paymentAmount(p.amount))} — ${SITUATION_LABEL[sit]}`}
                        onClick={e => { e.stopPropagation(); setFormError(''); setModal({ kind: 'editar', payment: p }); }}
                      >
                        <span className={styles.chipDot} style={{ background: cor }} />
                        <span className={styles.chipName}>{clientName(p.client_id)}</span>
                        <span className={styles.chipValue}>{formatBRL(paymentAmount(p.amount))}</span>
                      </button>
                    );
                  })}

                  {doDia.length > CHIPS_POR_CELULA && (
                    <span className={styles.chipOverflow}>+{doDia.length - CHIPS_POR_CELULA} mais</span>
                  )}

                  {doDia.length > 0 && (
                    <span className={styles.dots}>
                      {doDia.slice(0, 4).map(p => (
                        <span
                          key={`dot-${p.id}`}
                          className={styles.dot}
                          style={{ background: SITUATION_COLOR[paymentSituation(p.payment_date, todayYMD)] }}
                        />
                      ))}
                      {doDia.length > 4 && <span className={styles.dotExtra}>+{doDia.length - 4}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && visiveis.length === 0 && (
        <div className={styles.empty}>
          <CalendarClock size={26} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nenhum vencimento neste recorte</p>
          <p className={styles.emptyText}>
            {filtro === 'TODOS'
              ? 'Cadastre o primeiro vencimento de um cliente para ele aparecer no calendário.'
              : 'Nenhum pagamento com essa situação em ' + MESES[month].toLowerCase() + '.'}
          </p>
          <button
            className={styles.btnPrimary}
            onClick={() => { setFormError(''); setModal({ kind: 'novo', date: '' }); }}
          >
            <Plus size={16} /> Novo Vencimento
          </button>
        </div>
      )}

      <div className={styles.legenda}>
        {(['VENCIDO', 'HOJE', 'A_VENCER'] as PaymentSituation[]).map(sit => (
          <span key={sit} className={styles.legendaItem}>
            <span className={styles.legendaDot} style={{ background: SITUATION_COLOR[sit] }} />
            {SITUATION_LABEL[sit]}
          </span>
        ))}
        <span className={styles.legendaNota}>
          A situação é calculada pela data de vencimento.
        </span>
      </div>

      {modal?.kind === 'novo' && (
        <VencimentoModal
          titulo="Novo Vencimento"
          initial={{ ...EMPTY_FORM, payment_date: modal.date }}
          clients={clients}
          saving={saving}
          error={formError}
          onCancel={() => setModal(null)}
          onSave={form => void handleSave(form)}
        />
      )}

      {modal?.kind === 'editar' && (
        <VencimentoModal
          titulo="Editar Vencimento"
          initial={paymentToForm(modal.payment)}
          clients={clients}
          saving={saving}
          error={formError}
          onCancel={() => setModal(null)}
          onSave={form => void handleSave(form)}
          onDelete={() => void handleDelete()}
        />
      )}

      {daySheet && (
        <DaySheet
          date={daySheet.date}
          payments={daySheet.payments}
          clientName={clientName}
          todayYMD={todayYMD}
          onClose={() => setDaySheet(null)}
          onEdit={p => { setDaySheet(null); setFormError(''); setModal({ kind: 'editar', payment: p }); }}
          onNew={date => { setDaySheet(null); setFormError(''); setModal({ kind: 'novo', date }); }}
        />
      )}
    </div>
  );
}
