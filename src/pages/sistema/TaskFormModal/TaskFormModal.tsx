// ============================================================
// - createTask / updateTask: funções que já existiam e mandam os dados pro backend
// ============================================================
import { FormEvent, useEffect, useState } from 'react';
import Modal from '../../../components/sistema/Modal/Modal';
import { ApiError } from '../../../services/api';
import { ClientListItem, listClients } from '../../../services/clients';
import { ApiUser, listActiveUsers } from '../../../services/users';
import { ProcessListItem, listProcesses } from '../../../services/processes';
import {
  Task,
  TaskPriority,
  TaskWrite,
  createTask,
  updateTask,
} from '../../../services/tasks';
import styles from './TaskFormModal.module.css';

// ============================================================
// TaskForm = o que cada campo guarda
// EMPTY_FORM = modelo de formulário zerado, ponto de partida para criar tarefa
// ============================================================
type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  assignedTo: number | '';
  clientId: number | '';
  processId: number | '';
};

const EMPTY_FORM: TaskForm = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'MEDIUM',
  assignedTo: '',
  clientId: '',
  processId: '',
};

// ============================================================
// // toDateTimeLocal: reformata a data que vem do backend para o formato 
// aceito, se usa para editar a data em uma tarefa q ja existe
//
// errorMessage: se der erro ao salvar
// ============================================================
function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Não foi possível concluir a operação.';
}

// ============================================================
// BLOCO 4 — o que o formulário pode receber de quem abriu ele.

// task: se vier uma tarefa aqui, o modal entende "é edição".
// Se não vier nada, entende "é criação de uma tarefa nova".
// onClose: o que fazer quando o usuário fecha o modal.
// onSaved: o que fazer quando a tarefa foi salva com sucesso.
// ============================================================
type TaskFormModalProps = {
  task?: Task | null;
  // quando o modal abre de dentro da ficha de um processo, a tarefa
  // ja nasce vinculada a ele e o campo fica travado
  initialProcessId?: number;
  onClose: () => void;
  onSaved: (task: Task) => void;
};

// janela do formulário
export default function TaskFormModal({
  task,
  initialProcessId,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const isEditing = Boolean(task);
  const processLocked = !isEditing && initialProcessId !== undefined;

  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  // carregando pra enviar
  const [submitting, setSubmitting] = useState(false);
  // guarda mensagem de erro
  const [error, setError] = useState('');

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [processes, setProcesses] = useState<ProcessListItem[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  // ============================================================
  // preenche forms ao abrir
  // falta implementar no processos !!!!!!
  // - Se veio uma "task" (edição): copia os dados dela pros
  //   campos, pra aparecer o que já existe.
  // - Se não veio (criação): começa com tudo em branco.
  // ============================================================
  useEffect(() => {
    // se ja existir tarefa ele pega os dados ja existentes
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        dueDate: toDateTimeLocal(task.due_date),
        priority: task.priority,
        assignedTo: task.assigned_to ?? '',
        clientId: task.client_id ?? '',
        processId: task.process_id ?? '',
      });
      // se nao existia tarefa cria do zero, comeca com empty form
      // ja com o processo preenchido quando veio da ficha de um
    } else {
      setForm({ ...EMPTY_FORM, processId: initialProcessId ?? '' });
    }
  }, [task, initialProcessId]);

  // ============================================================
  // busca no backend as opções
  // ============================================================
  useEffect(() => {
    void Promise.all([
      listClients({ limit: 100 }).then(response => setClients(response.data)),
      listProcesses({ limit: 100 }).then(response => setProcesses(response.data)),
      listActiveUsers().then(response => setUsers(response.data)).catch(() => setUsers([])),
    ]).catch(err => setError(errorMessage(err)));
  }, []);

  function updateForm<K extends keyof TaskForm>(field: K, value: TaskForm[K]) {
    setForm(current => ({ ...current, [field]: value }));
  }

  // ============================================================
  // salvar
  // ============================================================
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const payload: TaskWrite = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      priority: form.priority,
      assigned_to: form.assignedTo || null,
      client_id: form.clientId || null,
      process_id: form.processId || null,
    };

    setSubmitting(true);
    try {
      const saved = task
        ? await updateTask(task.id, payload)
        : await createTask(payload);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // front do formulário
  // ============================================================

  return (
    <Modal title={isEditing ? 'Editar tarefa' : 'Criar tarefa'} onClose={onClose} width={660}>
      <form className={styles.taskForm} onSubmit={event => void handleSubmit(event)}>
        <div className={styles.formGrid}>

          <label className={styles.fullField}>
            <span>Título *</span>
            <input required maxLength={150} value={form.title} onChange={event => updateForm('title', event.target.value)} />
          </label>

          <label className={styles.fullField}>
            <span>Descrição</span>
            <textarea rows={4} maxLength={5000} value={form.description} onChange={event => updateForm('description', event.target.value)} />
          </label>

          <label>
            <span>Prioridade</span>
            <select value={form.priority} onChange={event => updateForm('priority', event.target.value as TaskPriority)}>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </label>

          <label>
            <span>Vencimento</span>
            <input type="datetime-local" value={form.dueDate} onChange={event => updateForm('dueDate', event.target.value)} />
          </label>

          <label>
            <span>Responsável</span>
            <select value={form.assignedTo} onChange={event => updateForm('assignedTo', event.target.value ? Number(event.target.value) : '')}>
              <option value="">Sem responsável</option>
              {users.map(user => <option value={user.id} key={user.id}>{user.name}</option>)}
            </select>
            {users.length === 0 && <small>Responsáveis disponíveis apenas para administradores.</small>}
          </label>

          <label>
            <span>Cliente vinculado</span>
            <select value={form.clientId} onChange={event => updateForm('clientId', event.target.value ? Number(event.target.value) : '')}>
              <option value="">Nenhum cliente</option>
              {clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}
            </select>
          </label>

          <label className={styles.fullField}>
            <span>Processo vinculado</span>
            <select
              value={form.processId}
              disabled={processLocked}
              onChange={event => updateForm('processId', event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Nenhum processo</option>
              {processes.map(process => (
                <option value={process.id} key={process.id}>{process.number} · {process.action_type}</option>
              ))}
            </select>
            {processLocked && <small>Tarefa criada dentro deste processo.</small>}
          </label>
        </div>

        {error && <p className={styles.formError}>{error}</p>}

        <div className={styles.formActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar tarefa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}