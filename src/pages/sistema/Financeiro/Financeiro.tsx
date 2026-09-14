import { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Wallet,
  X,
} from 'lucide-react';
import Modal from '../../../components/sistema/Modal/Modal';
import {
  listTransactions,
  getFinanceSummary,
  createIncome,
  createExpense,
} from '../../../services/finance';
import type {
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionCreate,
  TransactionType,
} from '../../../services/finance';
import { ApiError } from '../../../services/api';
import styles from './Financeiro.module.css';

const TYPE_LABEL: Record<TransactionType, string> = {
  INCOME:  'Entrada',
  EXPENSE: 'Saída',
};

const MODAL_TITLE: Record<TransactionType, string> = {
  INCOME:  'Nova Entrada',
  EXPENSE: 'Nova Saída',
};

const TYPE_STYLE: Record<TransactionType, React.CSSProperties> = {
  INCOME:  { background: '#e8f5e9', color: '#2e7d32' },
  EXPENSE: { background: '#fce4ec', color: 'var(--crimson)' },
};

const LIMIT = 20;

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return new Date(`${y}-${m}-${day}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** O backend serializa Decimal como string; converter só aqui, na exibição. */
function formatCurrency(amount: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Aceita "1500,50", "1.500,50" ou "1500.50" e devolve sempre com ponto. */
function normalizeAmount(raw: string) {
  const value = raw.trim();
  if (value.includes(',')) return value.replace(/\./g, '').replace(',', '.');
  return value;
}

export default function Financeiro() {
  const [items, setItems]     = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const [modalType, setModalType]   = useState<TransactionType | null>(null);
  const [formDesc, setFormDesc]     = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate]     = useState('');
  const [formError, setFormError]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async (p: number, from: string, to: string) => {
    setLoading(true);
    setError('');
    try {
      // Listagem e resumo compartilham o período e são buscados juntos para
      // que os cards e a tabela nunca fiquem dessincronizados.
      const [res, resumo] = await Promise.all([
        listTransactions({
          date_from: from || undefined,
          date_to:   to   || undefined,
          page:      p,
          limit:     LIMIT,
        }),
        getFinanceSummary({
          date_from: from || undefined,
          date_to:   to   || undefined,
        }),
      ]);
      setItems(res.data);
      setTotal(res.meta.total);
      setSummary(resumo);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_FINANCIAL_PERIOD') {
        setError('Período inválido: a data inicial não pode ser posterior à data final.');
      } else {
        setError('Não foi possível carregar os lançamentos financeiros.');
      }
      setItems([]);
      setTotal(0);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(page, dateFrom, dateTo);
  }, [fetchData, page, dateFrom, dateTo]);

  function openModal(type: TransactionType) {
    setFormDesc(''); setFormAmount(''); setFormDate('');
    setFormError('');
    setModalType(type);
  }

  function closeModal() { setModalType(null); setFormError(''); }

  function validateForm(): string {
    if (!formDesc.trim())   return 'Descrição é obrigatória.';
    if (!formAmount.trim()) return 'Valor é obrigatório.';
    const amount = normalizeAmount(formAmount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) return 'Valor inválido. Use o formato 1500,50.';
    if (Number(amount) <= 0) return 'Valor deve ser maior que zero.';
    if (!formDate)          return 'Data é obrigatória.';
    return '';
  }

  function buildPayload(): FinanceTransactionCreate {
    return {
      description:      formDesc.trim(),
      amount:           normalizeAmount(formAmount),
      transaction_date: formDate,
    };
  }

  async function salvarLancamento() {
    if (!modalType) return;
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSubmitting(true); setFormError('');
    try {
      const salvar = modalType === 'INCOME' ? createIncome : createExpense;
      await salvar(buildPayload());
      closeModal();
      if (page === 1) void fetchData(1, dateFrom, dateTo);
      else setPage(1);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Não foi possível salvar o lançamento.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages     = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters     = !!(dateFrom || dateTo);
  const saldoNegativo  = !!summary && Number(summary.balance) < 0;

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Controle Financeiro</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => openModal('INCOME')}>
            <Plus size={16} /> Nova Entrada
          </button>
          <button className={styles.btnExpense} onClick={() => openModal('EXPENSE')}>
            <Minus size={16} /> Nova Saída
          </button>
        </div>
      </div>

      {/* Resumo do período */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div className={styles.summaryIcon} style={{ background: '#e8f5e9' }}>
              <ArrowUpCircle size={20} color="#2e7d32" />
            </div>
          </div>
          <p className={styles.summaryLabel}>Total de Entradas</p>
          <p className={styles.summaryValue} style={{ color: '#2e7d32' }}>
            {summary ? formatCurrency(summary.total_income) : '—'}
          </p>
          <p className={styles.summarySub}>Receitas no período</p>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div className={styles.summaryIcon} style={{ background: '#fce4ec' }}>
              <ArrowDownCircle size={20} color="#661C16" />
            </div>
          </div>
          <p className={styles.summaryLabel}>Total de Saídas</p>
          <p className={styles.summaryValue} style={{ color: 'var(--crimson)' }}>
            {summary ? formatCurrency(summary.total_expense) : '—'}
          </p>
          <p className={styles.summarySub}>Despesas no período</p>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryTop}>
            <div className={styles.summaryIcon} style={{ background: '#e8eaf6' }}>
              <Wallet size={20} color="#232C43" />
            </div>
          </div>
          <p className={styles.summaryLabel}>Saldo</p>
          <p className={`${styles.summaryValue} ${saldoNegativo ? styles.summaryValueRed : ''}`}>
            {summary ? formatCurrency(summary.balance) : '—'}
          </p>
          <p className={styles.summarySub}>Entradas menos saídas</p>
        </div>
      </div>

      {/* Filtro por período */}
      <div className={styles.filterBar}>
        <div className={styles.filterDateGroup}>
          <span className={styles.filterLabel}>De</span>
          <input
            type="date"
            className={styles.filterInput}
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div className={styles.filterDateGroup}>
          <span className={styles.filterLabel}>Até</span>
          <input
            type="date"
            className={styles.filterInput}
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        {hasFilters && (
          <button
            className={styles.btnBack}
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
          >
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      {loading && <p className={styles.statusMsg}>Carregando...</p>}
      {error   && <p className={styles.errorMsg}>{error}</p>}

      {!loading && !error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th className={styles.amountHead}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <p className={styles.statusMsg}>Nenhum lançamento encontrado.</p>
                  </td>
                </tr>
              )}
              {items.map(t => (
                <tr key={t.id}>
                  <td className={styles.dateCell}>{formatDate(t.transaction_date)}</td>
                  <td className={styles.descCell}>{t.description}</td>
                  <td>
                    <span className={styles.badge} style={TYPE_STYLE[t.type]}>
                      {TYPE_LABEL[t.type]}
                    </span>
                  </td>
                  <td
                    className={`${styles.amountCell} ${
                      t.type === 'INCOME' ? styles.amountIncome : styles.amountExpense
                    }`}
                  >
                    {t.type === 'EXPENSE' ? '- ' : ''}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          Mostrando <strong>{items.length}</strong> de <strong>{total}</strong> lançamentos
        </span>
        <div className={styles.pageControls}>
          <button className={styles.pageArrow} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`${styles.pageNum} ${page === i + 1 ? styles.pageActive : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className={styles.pageArrow} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal de lançamento — mesmo formulário para entradas e saídas */}
      {modalType && (
        <Modal title={MODAL_TITLE[modalType]} onClose={closeModal}>
          <TransactionFormFields
            formDesc={formDesc}     setFormDesc={setFormDesc}
            formAmount={formAmount} setFormAmount={setFormAmount}
            formDate={formDate}     setFormDate={setFormDate}
          />
          {formError && <p className={styles.errorMsg}>{formError}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={closeModal}>Cancelar</button>
            <button
              className={modalType === 'INCOME' ? styles.btnPrimary : styles.btnExpense}
              onClick={() => void salvarLancamento()}
              disabled={submitting}
            >
              {modalType === 'INCOME' ? <Plus size={16} /> : <Minus size={16} />}
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}

interface FormProps {
  formDesc: string;   setFormDesc:   (v: string) => void;
  formAmount: string; setFormAmount: (v: string) => void;
  formDate: string;   setFormDate:   (v: string) => void;
}

function TransactionFormFields({
  formDesc, setFormDesc,
  formAmount, setFormAmount,
  formDate, setFormDate,
}: FormProps) {
  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Descrição</label>
        <input
          className={styles.fieldInput}
          value={formDesc}
          onChange={e => setFormDesc(e.target.value)}
          placeholder="Ex: Honorários contratuais"
          maxLength={255}
        />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Valor (R$)</label>
          <input
            className={styles.fieldInput}
            value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
          />
          <p className={styles.fieldHint}>Use vírgula ou ponto para os centavos.</p>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Data</label>
          <input
            type="date"
            className={styles.fieldInput}
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
