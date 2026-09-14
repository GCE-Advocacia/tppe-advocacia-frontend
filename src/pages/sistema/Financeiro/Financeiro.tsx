import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listTransactions } from '../../../services/finance';
import type { FinanceTransaction, TransactionType } from '../../../services/finance';
import styles from './Financeiro.module.css';

const TYPE_LABEL: Record<TransactionType, string> = {
  INCOME:  'Entrada',
  EXPENSE: 'Saída',
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

export default function Financeiro() {
  const [items, setItems]     = useState<FinanceTransaction[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await listTransactions({ page: p, limit: LIMIT });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch {
      setError('Não foi possível carregar os lançamentos financeiros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(page);
  }, [fetchData, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Controle Financeiro</h1>
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

    </div>
  );
}
