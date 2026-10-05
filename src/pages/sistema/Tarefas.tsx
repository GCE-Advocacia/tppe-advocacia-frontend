import { DragEvent, useEffect, useMemo, useState } from 'react';
import { useFeedback } from '../../hooks/useFeedback';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import TaskFormModal from './TaskFormModal/TaskFormModal';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  GripVertical,
  Link2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from 'lucide-react';
import Modal from '../../components/sistema/Modal/Modal';
import { ApiError } from '../../services/api';
import { ClientListItem, listClients } from '../../services/clients';
import { ApiUser, listActiveUsers } from '../../services/users';
import { ProcessListItem, listProcesses } from '../../services/processes';
import {
  Task,
  TaskKanban,
  TaskPriority,
  TaskStatus,
  deleteTask,
  getTaskKanban,
  listTasks,
  moveTask,
} from '../../services/tasks';
import styles from './Tarefas.module.css';

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

const STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  icon: React.ReactNode;
  tone: 'gray' | 'blue' | 'amber' | 'green';
}> = {
  TODO: { label: 'A fazer', icon: <CircleDashed size={17} />, tone: 'gray' },
  IN_PROGRESS: { label: 'Em andamento', icon: <Clock3 size={17} />, tone: 'blue' },
  BLOCKED: { label: 'Bloqueadas', icon: <LockKeyhole size={17} />, tone: 'amber' },
  DONE: { label: 'Concluídas', icon: <CheckCircle2 size={17} />, tone: 'green' },
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

function emptyKanban(): TaskKanban {
  return {
    TODO: { items: [], total: 0, has_more: false },
    IN_PROGRESS: { items: [], total: 0, has_more: false },
    BLOCKED: { items: [], total: 0, has_more: false },
    DONE: { items: [], total: 0, has_more: false },
  };
}

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function dueState(value: string | null): 'late' | 'today' | 'soon' | 'normal' {
  if (!value) return 'normal';
  const due = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const difference = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (difference < 0) return 'late';
  if (difference === 0) return 'today';
  if (difference <= 3) return 'soon';
  return 'normal';
}

function dueLabel(value: string | null): string {
  if (!value) return 'Sem vencimento';
  const state = dueState(value);
  if (state === 'late') return `Atrasada · ${formatDueDate(value)}`;
  if (state === 'today') return 'Vence hoje';
  return formatDueDate(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Somente o criador da tarefa ou um administrador pode excluí-la.';
    return error.message;
  }
  return 'Não foi possível concluir a operação.';
}

export default function Tarefas() {
  const [kanban, setKanban] = useState<TaskKanban>(emptyKanban);
  const { feedback, showFeedback } = useFeedback();
  const { loading, refreshing, run } = useAsyncAction(
    (error) => showFeedback(errorMessage(error), 'error'),
  );
  const [movingId, setMovingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [processes, setProcesses] = useState<ProcessListItem[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [assignedToFilter, setAssignedToFilter] = useState<number | ''>('');
  const [clientFilter, setClientFilter] = useState<number | ''>('');
  const [processFilter, setProcessFilter] = useState<number | ''>('');
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [columnPages, setColumnPages] = useState<Partial<Record<TaskStatus, number>>>({});
  const [loadingMore, setLoadingMore] = useState<Partial<Record<TaskStatus, boolean>>>({});
  const [dropInsertIndex, setDropInsertIndex] = useState<{ status: TaskStatus; index: number } | null>(null);

  const metrics = useMemo(() => ({
    total: STATUS_ORDER.reduce((sum, status) => sum + kanban[status].total, 0),
    open: kanban.TODO.total + kanban.IN_PROGRESS.total + kanban.BLOCKED.total,
    urgent: STATUS_ORDER.flatMap(status => kanban[status].items).filter(task => task.priority === 'HIGH' && task.status !== 'DONE').length,
    dueSoon: STATUS_ORDER.flatMap(status => kanban[status].items).filter(task => ['late', 'today', 'soon'].includes(dueState(task.due_date)) && task.status !== 'DONE').length,
  }), [kanban]);

  async function loadKanban(isRefresh = false) {
    await run(async () => {
      setKanban(await getTaskKanban({
        assignedTo: assignedToFilter,
        clientId: clientFilter,
        processId: processFilter,
      }));
      setColumnPages({});
    }, isRefresh);
  }

  useEffect(() => {
    void Promise.all([
      listClients({ limit: 100 }).then(response => setClients(response.data)),
      listProcesses({ limit: 100 }).then(response => setProcesses(response.data)),
      listActiveUsers().then(response => setUsers(response.data)).catch(() => setUsers([])),
    ]).catch(error => showFeedback(errorMessage(error), 'error'));
  }, []);

  useEffect(() => {
    void loadKanban();
  }, [assignedToFilter, clientFilter, processFilter]);

  async function handleLoadMore(status: TaskStatus) {
    const nextPage = (columnPages[status] ?? 1) + 1;
    setLoadingMore(prev => ({ ...prev, [status]: true }));
    try {
      const result = await listTasks({
        status,
        assigned_to: assignedToFilter || undefined,
        client_id: clientFilter || undefined,
        process_id: processFilter || undefined,
        page: nextPage,
      });
      setKanban(prev => ({
        ...prev,
        [status]: {
          ...prev[status],
          items: [...prev[status].items, ...result.data],
          has_more: result.meta.page < result.meta.pages,
        },
      }));
      setColumnPages(prev => ({ ...prev, [status]: nextPage }));
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setLoadingMore(prev => ({ ...prev, [status]: false }));
    }
  }

  async function handleMove(task: Task, status: TaskStatus, order: number) {
    if (movingId !== null || (task.status === status && task.order === order)) return;
    setMovingId(task.id);
    try {
      await moveTask(task.id, status, order);
      await loadKanban(true);
      showFeedback(`"${task.title}" movida para ${STATUS_CONFIG[status].label.toLowerCase()}.`);
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setMovingId(null);
      setDraggingId(null);
      setDropTarget(null);
    }
  }

  function adjacentStatus(status: TaskStatus, direction: -1 | 1): TaskStatus | null {
    const index = STATUS_ORDER.indexOf(status) + direction;
    return STATUS_ORDER[index] ?? null;
  }

  function handleDragStart(event: DragEvent<HTMLElement>, task: Task) {
    setDraggingId(task.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
  }

  function handleCardDragOver(event: DragEvent<HTMLElement>, status: TaskStatus, cardIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const insertIndex = event.clientY < rect.top + rect.height / 2 ? cardIndex : cardIndex + 1;
    setDropTarget(status);
    setDropInsertIndex({ status, index: insertIndex });
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData('text/plain'));
    const task = STATUS_ORDER.flatMap(item => kanban[item].items).find(item => item.id === taskId);
    const order = dropInsertIndex?.status === status ? dropInsertIndex.index : kanban[status].items.length;
    setDropInsertIndex(null);
    if (task) void handleMove(task, status, order);
  }

  function openCreate() {
    setEditingTask(null);
    setShowCreate(true);
  }

  function openEdit(task: Task) {
    setShowCreate(false);
    setEditingTask(task);
  }

  function closeForm() {
    setShowCreate(false);
    setEditingTask(null);
  }

  function handleTaskSaved(saved: Task) {
    const wasEditing = Boolean(editingTask);
    closeForm();
    void loadKanban(true);
    showFeedback(wasEditing ? `"${saved.title}" atualizada com sucesso.` : `"${saved.title}" criada em A fazer.`);
  }

  function clearFilters() {
    setAssignedToFilter('');
    setClientFilter('');
    setProcessFilter('');
  }

  function openDelete(task: Task) {
    setDeletingTask(task);
    setDeleteError('');
  }

  async function handleDelete() {
    if (!deletingTask) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      const title = deletingTask.title;
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
      await loadKanban(true);
      showFeedback(`"${title}" excluída com sucesso.`);
    } catch (error) {
      setDeleteError(errorMessage(error));
    } finally {
      setDeleteSubmitting(false);
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
          <p className={styles.eyebrow}>Organização operacional</p>
          <h1>Tarefas</h1>
          <p className={styles.subtitle}>Acompanhe o trabalho do escritório por etapa.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshButton} onClick={() => void loadKanban(true)} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? styles.spinning : ''} />
            Atualizar
          </button>
          <button className={styles.primaryButton} onClick={openCreate}>
            <Plus size={17} />
            Nova tarefa
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric icon={<CircleDashed size={20} />} label="Tarefas cadastradas" value={metrics.total} tone="navy" />
        <Metric icon={<Clock3 size={20} />} label="Em aberto" value={metrics.open} tone="blue" />
        <Metric icon={<AlertCircle size={20} />} label="Prioridade alta" value={metrics.urgent} tone="crimson" />
        <Metric icon={<CalendarClock size={20} />} label="Vencendo ou atrasadas" value={metrics.dueSoon} tone="amber" />
      </section>

      <section className={styles.filters}>
        <div className={styles.filterTitle}>
          <SlidersHorizontal size={16} />
          <span>Filtrar quadro</span>
        </div>
        <select value={assignedToFilter} onChange={event => setAssignedToFilter(event.target.value ? Number(event.target.value) : '')}>
          <option value="">Todos os responsáveis</option>
          {users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}
        </select>
        <select value={clientFilter} onChange={event => setClientFilter(event.target.value ? Number(event.target.value) : '')}>
          <option value="">Todos os clientes</option>
          {clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}
        </select>
        <select value={processFilter} onChange={event => setProcessFilter(event.target.value ? Number(event.target.value) : '')}>
          <option value="">Todos os processos</option>
          {processes.map(process => <option value={process.id} key={process.id}>{process.number}</option>)}
        </select>
        {(assignedToFilter || clientFilter || processFilter) && (
          <button onClick={clearFilters}>Limpar filtros</button>
        )}
      </section>

      <section className={styles.board} aria-label="Quadro de tarefas">
        {STATUS_ORDER.map(status => {
          const config = STATUS_CONFIG[status];
          const column = kanban[status];
          return (
            <section
              className={`${styles.column} ${dropTarget === status ? styles.dropActive : ''}`}
              key={status}
              onDragOver={event => { event.preventDefault(); setDropTarget(status); }}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDropTarget(null);
                  setDropInsertIndex(null);
                }
              }}
              onDrop={event => handleDrop(event, status)}
            >
              <header className={styles.columnHeader}>
                <div className={`${styles.columnTitle} ${styles[config.tone]}`}>
                  {config.icon}
                  <h2>{config.label}</h2>
                </div>
                <span>{column.total}</span>
              </header>

              <div className={styles.taskList}>
                {loading && <ColumnLoading />}
                {!loading && column.items.map((task, cardIndex) => (
                  <div key={task.id} className={styles.cardWrapper}>
                    {dropInsertIndex?.status === status && dropInsertIndex.index === cardIndex && draggingId !== null && (
                      <div className={styles.dropInsert} aria-hidden="true" />
                    )}
                    <article
                      className={`${styles.taskCard} ${draggingId === task.id ? styles.dragging : ''}`}
                      key={task.id}
                      draggable={movingId === null}
                      onDragStart={event => handleDragStart(event, task)}
                      onDragEnd={() => { setDraggingId(null); setDropTarget(null); setDropInsertIndex(null); }}
                      onDragOver={event => handleCardDragOver(event, status, cardIndex)}
                  >
                    <div className={styles.taskTopline}>
                      <span className={`${styles.priority} ${styles[`priority${task.priority}`]}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      <div className={styles.cardTools}>
                        <button
                          onClick={() => openEdit(task)}
                          onMouseDown={event => event.stopPropagation()}
                          title="Editar tarefa"
                          aria-label="Editar tarefa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={styles.deleteCardButton}
                          onClick={() => openDelete(task)}
                          onMouseDown={event => event.stopPropagation()}
                          title="Excluir tarefa"
                          aria-label="Excluir tarefa"
                        >
                          <Trash2 size={14} />
                        </button>
                        <GripVertical size={16} className={styles.grip} aria-hidden="true" />
                      </div>
                    </div>
                    <h3>{task.title}</h3>
                    {task.description && <p className={styles.description}>{task.description}</p>}

                    <div className={styles.taskMeta}>
                      <span className={`${styles.dueDate} ${styles[dueState(task.due_date)]}`}>
                        <CalendarClock size={14} />
                        {dueLabel(task.due_date)}
                      </span>
                      <span>
                        <UserRound size={14} />
                        {task.assigned_to_name ?? 'Sem responsável'}
                      </span>
                      {(task.client_id || task.process_id) && (
                        <span>
                          <Link2 size={14} />
                          {task.process_id ? 'Processo vinculado' : 'Cliente vinculado'}
                        </span>
                      )}
                    </div>

                    <footer className={styles.taskActions}>
                      <button
                        aria-label="Mover para etapa anterior"
                        title="Mover para etapa anterior"
                        disabled={!adjacentStatus(task.status, -1) || movingId !== null}
                        onClick={() => {
                          const target = adjacentStatus(task.status, -1);
                          if (target) void handleMove(task, target, kanban[target].items.length);
                        }}
                      >
                        <ArrowLeft size={15} />
                      </button>
                      <span>{task.created_by_name}</span>
                      <button
                        aria-label="Mover para próxima etapa"
                        title="Mover para próxima etapa"
                        disabled={!adjacentStatus(task.status, 1) || movingId !== null}
                        onClick={() => {
                          const target = adjacentStatus(task.status, 1);
                          if (target) void handleMove(task, target, kanban[target].items.length);
                        }}
                      >
                        <ArrowRight size={15} />
                      </button>
                    </footer>
                  </article>
                  </div>
                ))}
                {!loading && draggingId !== null && dropInsertIndex?.status === status && dropInsertIndex.index >= column.items.length && (
                  <div className={styles.dropInsert} aria-hidden="true" />
                )}
                {!loading && column.items.length === 0 && (
                  <div className={styles.emptyColumn}>
                    <span className={`${styles.emptyIcon} ${styles[config.tone]}`}>{config.icon}</span>
                    <p>Nenhuma tarefa nesta etapa.</p>
                  </div>
                )}
                {!loading && column.has_more && (
                  <button
                    className={styles.loadMoreButton}
                    disabled={!!loadingMore[status]}
                    onClick={() => void handleLoadMore(status)}
                  >
                    {loadingMore[status]
                      ? 'Carregando...'
                      : `Ver mais (${column.total - column.items.length} restantes)`}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </section>

      {(showCreate || editingTask) && (
        <TaskFormModal
          task={editingTask}
          onClose={closeForm}
          onSaved={handleTaskSaved}
        />
      )}

      {deletingTask && (
        <Modal title="Excluir tarefa" onClose={() => setDeletingTask(null)} width={500}>
          <div className={styles.deleteContent}>
            <div className={styles.deleteNotice}>
              <Trash2 size={20} />
              <div>
                <strong>Excluir “{deletingTask.title}”?</strong>
                <p>A tarefa será removida do quadro. Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            {deleteError && <p className={styles.formError}>{deleteError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDeletingTask(null)}>Cancelar</button>
              <button type="button" className={styles.deleteButton} onClick={() => void handleDelete()} disabled={deleteSubmitting}>
                <Trash2 size={15} />
                {deleteSubmitting ? 'Excluindo...' : 'Excluir tarefa'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metric({ icon, label, value, tone }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'navy' | 'blue' | 'crimson' | 'amber';
}) {
  return (
    <div className={styles.metric}>
      <span className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ColumnLoading() {
  return (
    <>
      <div className={styles.loadingCard} />
      <div className={styles.loadingCard} />
    </>
  );
}
