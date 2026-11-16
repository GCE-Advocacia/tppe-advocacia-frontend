import { useEffect, useState } from 'react';
import { useFeedback } from '../../hooks/useFeedback';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  Lead,
  LeadStatus,
  listLeads,
  updateLead,
} from '../../services/leads';
import { ApiUser, listActiveUsers } from '../../services/users';
import styles from './Leads.module.css';

const STATUS_OPTIONS: LeadStatus[] = ['novo', 'em_atendimento', 'fechado', 'descartado'];

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  em_atendimento: 'Em atendimento',
  fechado: 'Fechado',
  descartado: 'Descartado',
};

const STATUS_CLASS: Record<LeadStatus, string> = {
  novo: 'newStatus',
  em_atendimento: 'serviceStatus',
  fechado: 'closedStatus',
  descartado: 'discardedStatus',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}


function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Você não tem permissão para acessar esta área.';
  }
  return 'Não foi possível concluir a operação.';
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [assignedTo, setAssignedTo] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusTotals, setStatusTotals] = useState({ novo: 0, em_atendimento: 0, fechado: 0 });
  const { feedback, showFeedback } = useFeedback();
  const { loading, refreshing, run } = useAsyncAction(
    (error) => showFeedback(errorMessage(error), 'error'),
  );

  async function loadData(isRefresh = false) {
    await run(async () => {
      const [response, novos, emAtendimento, fechados] = await Promise.all([
        listLeads({ page, limit: 12, status, assignedTo }),
        listLeads({ page: 1, limit: 1, status: 'novo' }),
        listLeads({ page: 1, limit: 1, status: 'em_atendimento' }),
        listLeads({ page: 1, limit: 1, status: 'fechado' }),
      ]);
      setLeads(response.data);
      setTotal(response.meta.total);
      setPages(response.meta.pages);
      setStatusTotals({
        novo: novos.meta.total,
        em_atendimento: emAtendimento.meta.total,
        fechado: fechados.meta.total,
      });
    }, isRefresh);
  }

  useEffect(() => {
    void loadData();
  }, [page, status, assignedTo]);

  useEffect(() => {
    listActiveUsers()
      .then(response => setUsers(response.data))
      .catch(() => setUsers([]));
  }, []);

  async function handleUpdate(payload: { status?: LeadStatus; assigned_to?: number }) {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await updateLead(selected.id, payload);
      setSelected(updated);
      setLeads(current => current.map(lead => lead.id === updated.id ? updated : lead));
      await loadData(true);
      showFeedback('Lead atualizado com sucesso.');
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className={styles.page}>
      {feedback && (
        <div className={`${styles.toast} ${feedback.kind === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {feedback.message}
        </div>
      )}

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Relacionamento comercial</p>
          <h1>Gestão de Leads</h1>
          <p className={styles.subtitle}>Acompanhe os contatos recebidos pela landing page.</p>
        </div>
        <button className={styles.refreshButton} onClick={() => void loadData(true)} disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? styles.spinning : ''} />
          Atualizar
        </button>
      </header>

      <section className={styles.metrics}>
        <Metric icon={<UsersRound size={20} />} label="Total de leads" value={total} tone="navy" />
        <Metric icon={<UserPlus size={20} />} label="Novos" value={statusTotals.novo} tone="blue" />
        <Metric icon={<Clock3 size={20} />} label="Em atendimento" value={statusTotals.em_atendimento} tone="amber" />
        <Metric icon={<CheckCircle2 size={20} />} label="Fechados" value={statusTotals.fechado} tone="green" />
      </section>

      <section className={styles.panel}>
        <div className={styles.filters}>
          <select value={status} onChange={event => { setStatus(event.target.value as LeadStatus | ''); setPage(1); }}>
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(option => <option value={option} key={option}>{STATUS_LABELS[option]}</option>)}
          </select>
          <select value={assignedTo} onChange={event => { setAssignedTo(event.target.value ? Number(event.target.value) : ''); setPage(1); }}>
            <option value="">Todos os responsáveis</option>
            {users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}
          </select>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Responsável</th>
                <th>Recebido em</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className={styles.empty}>Carregando leads...</td></tr>}
              {!loading && leads.map(lead => (
                <tr key={lead.id}>
                  <td><strong>{lead.name}</strong></td>
                  <td>
                    <div className={styles.contact}>
                      <span>{lead.email}</span>
                      {lead.phone && <span>{lead.phone}</span>}
                    </div>
                  </td>
                  <td>{users.find(user => user.id === lead.assigned_to)?.name ?? 'Não atribuído'}</td>
                  <td>{formatDate(lead.created_at)}</td>
                  <td><StatusBadge status={lead.status} /></td>
                  <td><button className={styles.openButton} onClick={() => setSelected(lead)}>Abrir contato</button></td>
                </tr>
              ))}
              {!loading && leads.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>Nenhum lead encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <span>Mostrando <strong>{leads.length}</strong> de <strong>{total}</strong> lead(s)</span>
          <div className={styles.pagination}>
            <button onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}><ChevronLeft size={16} /></button>
            <span>Página {page} de {pages}</span>
            <button onClick={() => setPage(current => Math.min(pages, current + 1))} disabled={page === pages}><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>

      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={event => event.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <p className={styles.eyebrow}>Contato recebido</p>
                <h2>{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Fechar"><X size={19} /></button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.contactLinks}>
                <a href={`mailto:${selected.email}`}><Mail size={16} /> {selected.email}</a>
                {selected.phone && <a href={`tel:${selected.phone}`}><Phone size={16} /> {selected.phone}</a>}
              </div>

              <div className={styles.messageBox}>
                <MessageSquareText size={18} />
                <p>{selected.message ?? 'O contato não deixou uma mensagem.'}</p>
              </div>

              <div className={styles.field}>
                <label>Status do atendimento</label>
                <select
                  value={selected.status}
                  onChange={event => void handleUpdate({ status: event.target.value as LeadStatus })}
                  disabled={updating}
                >
                  {STATUS_OPTIONS.map(option => <option value={option} key={option}>{STATUS_LABELS[option]}</option>)}
                </select>
              </div>

              <div className={styles.field}>
                <label>Responsável</label>
                <select
                  value={selected.assigned_to ?? ''}
                  onChange={event => {
                    const value = event.target.value;
                    void handleUpdate({ assigned_to: value ? Number(value) : null });
                  }}
                  disabled={updating}
                >
                  <option value="">Selecione um responsável</option>
                  {users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}
                </select>
              </div>

              <dl className={styles.details}>
                <div><dt>Recebido em</dt><dd>{formatDate(selected.created_at)}</dd></div>
                <div><dt>Última atualização</dt><dd>{formatDate(selected.updated_at)}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[status]]}`}>{STATUS_LABELS[status]}</span>;
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <article className={styles.metric}>
      <span className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </article>
  );
}
