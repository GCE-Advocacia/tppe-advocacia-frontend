import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  FileText,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  X,
  UserRound,
  UsersRound,
} from 'lucide-react';
import Modal from '../../components/sistema/Modal/Modal';
import { ApiError, getSessionClaims } from '../../services/api';
import {
  Client,
  ClientCreate,
  ClientListItem,
  ClientTimeline,
  ProcessStatus,
  anonymizeClient,
  createClient,
  createClientNote,
  getClientTimeline,
  listClients,
  updateClient,
  updateClientNote,
} from '../../services/clients';
import { ProcessListItem, listProcesses } from '../../services/processes';
import styles from './Clientes.module.css';

type ClientKind = 'person' | 'company';

type ClientForm = {
  kind: ClientKind;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
};

const EMPTY_FORM: ClientForm = {
  kind: 'person',
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
};

const STATUS_LABELS: Record<ProcessStatus, string> = {
  ATIVO: 'Ativo',
  SUSPENSO: 'Suspenso',
  ARQUIVADO: 'Arquivado',
  ENCERRADO: 'Encerrado',
};

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatDocument(cpf: string | null, cnpj: string | null): string {
  if (cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (cnpj) {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return 'Documento não informado';
}

function formatInputDocument(value: string, kind: ClientKind): string {
  const normalized = digits(value).slice(0, kind === 'person' ? 11 : 14);
  if (kind === 'person') {
    return normalized
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return normalized
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function activityTitle(kind: 'movement' | 'client_note', title: string | null): string {
  return kind === 'client_note' ? 'Observação adicionada' : title ?? 'Movimentação processual';
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'CLIENT_HAS_ACTIVE_PROCESSES') {
      return 'Este cliente possui processos ativos ou suspensos e não pode ser anonimizado.';
    }
    if (error.status === 403) return 'Somente administradores podem realizar esta operação.';
    if (error.code === 'CLIENT_CPF_ALREADY_EXISTS') return 'Já existe um cliente com este CPF.';
    if (error.code === 'CLIENT_CNPJ_ALREADY_EXISTS') return 'Já existe um cliente com este CNPJ.';
    return error.message;
  }
  return 'Não foi possível concluir a operação.';
}

export default function Clientes() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [timeline, setTimeline] = useState<ClientTimeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [note, setNote] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: number; content: string } | null>(null);
  const [noteEditSubmitting, setNoteEditSubmitting] = useState(false);
  const [anonymizingClient, setAnonymizingClient] = useState<Client | null>(null);
  const [anonymizeConfirmation, setAnonymizeConfirmation] = useState('');
  const [anonymizeSubmitting, setAnonymizeSubmitting] = useState(false);
  const [anonymizeError, setAnonymizeError] = useState('');
  const [processResults, setProcessResults] = useState<ProcessListItem[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const isAdmin = getSessionClaims()?.role === 'ADMIN';
  const navigate = useNavigate();

  const stats = useMemo(() => ({
    people: clients.filter(client => client.cpf).length,
    companies: clients.filter(client => client.cnpj).length,
    withEmail: clients.filter(client => client.email).length,
  }), [clients]);

  async function loadClients(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setProcessResults([]);
    try {
      const response = await listClients({ page, limit: 12, search });
      setClients(response.data);
      setTotal(response.meta.total);
      setPages(response.meta.pages || 1);
      if (response.data.length === 0 && search) {
        const proc = await listProcesses({ search, limit: 8 });
        setProcessResults(proc.data.filter(p => p.client_id !== null));
      }
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, [page, search]);

  function showFeedback(message: string, kind: 'success' | 'error' = 'success') {
    setFeedback({ message, kind });
    window.setTimeout(() => setFeedback(null), 4500);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openCreate() {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowCreate(true);
  }

  function openEdit(client: Client) {
    const kind: ClientKind = client.cpf ? 'person' : 'company';
    setForm({
      kind,
      name: client.name,
      document: formatInputDocument(client.cpf ?? client.cnpj ?? '', kind),
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
    });
    setFormError('');
    setEditingClient(client);
  }

  function updateForm<K extends keyof ClientForm>(field: K, value: ClientForm[K]) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function changeKind(kind: ClientKind) {
    setForm(current => ({ ...current, kind, document: '' }));
  }

  async function handleSaveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const document = digits(form.document);
    const expectedLength = form.kind === 'person' ? 11 : 14;
    if (document.length !== expectedLength) {
      setFormError(`Informe um ${form.kind === 'person' ? 'CPF' : 'CNPJ'} completo.`);
      return;
    }

    const payload: ClientCreate = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      cpf: form.kind === 'person' ? document : null,
      cnpj: form.kind === 'company' ? document : null,
      address: form.address.trim() || null,
    };

    setSubmitting(true);
    try {
      const saved = editingClient
        ? await updateClient(editingClient.id, payload)
        : await createClient(payload);
      const response = await listClients({ page: 1, limit: 12 });
      setClients(response.data);
      setTotal(response.meta.total);
      setPages(response.meta.pages || 1);
      setShowCreate(false);
      setEditingClient(null);
      setSearch('');
      setSearchInput('');
      setPage(1);
      if (editingClient) {
        await refreshTimeline(saved.id);
        showFeedback('Dados do cliente atualizados com sucesso.');
      } else {
        showFeedback(`${saved.name} foi cadastrado com sucesso.`);
      }
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function openTimeline(clientId: number) {
    setTimelineLoading(true);
    setNote('');
    try {
      setTimeline(await getClientTimeline(clientId));
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setTimelineLoading(false);
    }
  }

  async function refreshTimeline(clientId: number) {
    try {
      setTimeline(await getClientTimeline(clientId));
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    }
  }

  async function handleCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timeline || !note.trim()) return;
    setNoteSubmitting(true);
    try {
      await createClientNote(timeline.client.id, note.trim());
      setNote('');
      await refreshTimeline(timeline.client.id);
      showFeedback('Observação registrada no histórico do cliente.');
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setNoteSubmitting(false);
    }
  }

  async function handleUpdateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timeline || !editingNote || !editingNote.content.trim()) return;
    setNoteEditSubmitting(true);
    try {
      await updateClientNote(timeline.client.id, editingNote.id, editingNote.content.trim());
      setEditingNote(null);
      await refreshTimeline(timeline.client.id);
      showFeedback('Observação atualizada.');
    } catch (error) {
      showFeedback(errorMessage(error), 'error');
    } finally {
      setNoteEditSubmitting(false);
    }
  }

  function openAnonymize(client: Client) {
    setAnonymizingClient(client);
    setAnonymizeConfirmation('');
    setAnonymizeError('');
  }

  async function handleAnonymize() {
    if (!anonymizingClient || anonymizeConfirmation !== anonymizingClient.name) return;
    setAnonymizeSubmitting(true);
    setAnonymizeError('');
    try {
      await anonymizeClient(anonymizingClient.id);
      setAnonymizingClient(null);
      setTimeline(null);
      await loadClients(true);
      showFeedback('Cliente anonimizado com sucesso. Os dados pessoais foram removidos.');
    } catch (error) {
      setAnonymizeError(errorMessage(error));
    } finally {
      setAnonymizeSubmitting(false);
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
          <p className={styles.eyebrow}>Carteira jurídica</p>
          <h1>Clientes</h1>
          <p className={styles.subtitle}>Consulte e mantenha os dados dos clientes do escritório.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={() => void loadClients(true)} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? styles.spinning : ''} />
            Atualizar
          </button>
          <button className={styles.primaryButton} onClick={openCreate}>
            <Plus size={17} />
            Novo cliente
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric icon={<UsersRound size={20} />} label="Clientes encontrados" value={total} tone="navy" />
        <Metric icon={<UserRound size={20} />} label="Pessoas nesta página" value={stats.people} tone="blue" />
        <Metric icon={<Building2 size={20} />} label="Empresas nesta página" value={stats.companies} tone="amber" />
        <Metric icon={<Mail size={20} />} label="Com e-mail nesta página" value={stats.withEmail} tone="green" />
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <Search size={17} />
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Buscar por nome, CPF ou CNPJ"
              aria-label="Buscar clientes"
            />
            <button type="submit">Buscar</button>
          </form>
          {search && (
            <button
              className={styles.clearSearch}
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            >
              Limpar busca
            </button>
          )}
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className={styles.empty}>Carregando clientes...</td></tr>}
              {!loading && clients.map(client => (
                <tr key={client.id}>
                  <td>
                    <div className={styles.client}>
                      <div>
                        <strong>{client.name}</strong>
                        <span>{client.email ?? 'E-mail não informado'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.kindBadge} ${client.cpf ? styles.personBadge : styles.companyBadge}`}>
                      {client.cpf ? 'Pessoa física' : 'Pessoa jurídica'}
                    </span>
                  </td>
                  <td>{formatDocument(client.cpf, client.cnpj)}</td>
                  <td>{client.phone ?? 'Não informado'}</td>
                  <td>
                    <button className={styles.openButton} onClick={() => void openTimeline(client.id)} disabled={timelineLoading}>
                      Ver ficha 360
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && clients.length === 0 && processResults.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && processResults.length > 0 && (
          <div className={styles.processFallback}>
            <p className={styles.processFallbackLabel}>
              <FileText size={14} />
              Nenhum cliente encontrado pelo termo buscado. Processos vinculados:
            </p>
            {processResults.map(process => (
              <div key={process.id} className={styles.processFallbackItem}>
                <div className={styles.processFallbackInfo}>
                  <strong>{process.number}</strong>
                  <span>{process.action_type} · {process.court}</span>
                  {process.client_name && <span className={styles.processFallbackClient}>{process.client_name}</span>}
                </div>
                <button
                  className={styles.openButton}
                  onClick={() => void openTimeline(process.client_id!)}
                  disabled={timelineLoading}
                >
                  Ver ficha
                </button>
              </div>
            ))}
          </div>
        )}

        <footer className={styles.footer}>
          <span>Mostrando <strong>{clients.length}</strong> de <strong>{total}</strong> cliente(s)</span>
          <div className={styles.pagination}>
            <button aria-label="Página anterior" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
            </button>
            <span>Página {page} de {pages}</span>
            <button aria-label="Próxima página" onClick={() => setPage(current => Math.min(pages, current + 1))} disabled={page === pages}>
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {(showCreate || editingClient) && (
        <Modal
          title={editingClient ? 'Editar cliente' : 'Cadastrar cliente'}
          onClose={() => { setShowCreate(false); setEditingClient(null); }}
          width={620}
        >
          <form className={styles.createForm} onSubmit={handleSaveClient}>
            <div className={styles.kindSelector}>
              <button
                type="button"
                className={form.kind === 'person' ? styles.activeKind : ''}
                onClick={() => changeKind('person')}
              >
                <UserRound size={17} />
                Pessoa física
              </button>
              <button
                type="button"
                className={form.kind === 'company' ? styles.activeKind : ''}
                onClick={() => changeKind('company')}
              >
                <Building2 size={17} />
                Pessoa jurídica
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.fullField}>
                <span>{form.kind === 'person' ? 'Nome completo' : 'Razão social'} *</span>
                <input required minLength={2} maxLength={120} value={form.name} onChange={event => updateForm('name', event.target.value)} />
              </label>
              <label>
                <span>{form.kind === 'person' ? 'CPF' : 'CNPJ'} *</span>
                <input
                  required
                  inputMode="numeric"
                  value={form.document}
                  placeholder={form.kind === 'person' ? '000.000.000-00' : '00.000.000/0000-00'}
                  onChange={event => updateForm('document', formatInputDocument(event.target.value, form.kind))}
                />
              </label>
              <label>
                <span>Telefone</span>
                <input maxLength={20} value={form.phone} onChange={event => updateForm('phone', event.target.value)} />
              </label>
              <label className={styles.fullField}>
                <span>E-mail</span>
                <input type="email" value={form.email} onChange={event => updateForm('email', event.target.value)} />
              </label>
              <label className={styles.fullField}>
                <span>Endereço</span>
                <textarea rows={3} value={form.address} onChange={event => updateForm('address', event.target.value)} />
              </label>
            </div>

            {formError && <p className={styles.formError}>{formError}</p>}

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => { setShowCreate(false); setEditingClient(null); }}>Cancelar</button>
              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? 'Salvando...' : editingClient ? 'Salvar alterações' : 'Cadastrar cliente'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {timeline && (
        <div className={styles.overlay} onClick={() => setTimeline(null)}>
          <aside className={styles.drawer} onClick={event => event.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerIdentity}>
                <span className={styles.drawerAvatar}>{initials(timeline.client.name)}</span>
                <div>
                  <p className={styles.eyebrow}>Ficha 360 do cliente</p>
                  <h2>{timeline.client.name}</h2>
                  <span>{formatDocument(timeline.client.cpf, timeline.client.cnpj)}</span>
                </div>
              </div>
              <div className={styles.drawerActions}>
                <button onClick={() => openEdit(timeline.client)} title="Editar dados" aria-label="Editar dados">
                  <Pencil size={17} />
                </button>
                {isAdmin && timeline.client.email && (
                  <button
                    onClick={() => navigate(`/sistema/emails?busca=${encodeURIComponent(timeline.client.email ?? '')}`)}
                    title="Ver e-mails enviados ao cliente"
                    aria-label="Ver e-mails enviados ao cliente"
                  >
                    <Inbox size={17} />
                  </button>
                )}
                {isAdmin && (
                  <button className={styles.dangerIconButton} onClick={() => openAnonymize(timeline.client)} title="Anonimizar cliente" aria-label="Anonimizar cliente">
                    <Trash2 size={17} />
                  </button>
                )}
                <button onClick={() => setTimeline(null)} title="Fechar ficha" aria-label="Fechar ficha"><X size={19} /></button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              <section className={styles.clientSummary}>
                <Info icon={<Mail size={15} />} label="E-mail" value={timeline.client.email ?? 'Não informado'} />
                <Info icon={<Phone size={15} />} label="Telefone" value={timeline.client.phone ?? 'Não informado'} />
                <Info icon={<MapPin size={15} />} label="Endereço" value={timeline.client.address ?? 'Não informado'} />
                <Info icon={<CalendarClock size={15} />} label="Cliente desde" value={formatDate(timeline.client.created_at)} />
              </section>

              <section className={styles.drawerSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <BriefcaseBusiness size={17} />
                    <h3>Processos vinculados</h3>
                  </div>
                  <span>{timeline.processes.length}</span>
                </div>
                <div className={styles.processList}>
                  {timeline.processes.map(process => (
                    <article className={styles.processItem} key={process.id}>
                      <div className={styles.processTopline}>
                        <strong>{process.number}</strong>
                        <span className={`${styles.processStatus} ${styles[`status${process.status}`]}`}>
                          {STATUS_LABELS[process.status]}
                        </span>
                      </div>
                      <p>{process.action_type} · {process.court}</p>
                      <div className={styles.lastMovement}>
                        <Clock3 size={13} />
                        {process.last_movement
                          ? `${process.last_movement.title} · ${formatDate(process.last_movement.occurred_at)}`
                          : 'Nenhuma movimentação registrada'}
                      </div>
                    </article>
                  ))}
                  {timeline.processes.length === 0 && <p className={styles.sectionEmpty}>Nenhum processo vinculado.</p>}
                </div>
              </section>

              <section className={styles.drawerSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <MessageSquareText size={17} />
                    <h3>Observações</h3>
                  </div>
                  <span>{timeline.notes.length}</span>
                </div>
                <form className={styles.noteForm} onSubmit={handleCreateNote}>
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    placeholder="Registre uma informação relevante sobre este cliente"
                  />
                  <button type="submit" disabled={noteSubmitting || !note.trim()}>
                    <Send size={15} />
                    {noteSubmitting ? 'Registrando...' : 'Registrar'}
                  </button>
                </form>
                <div className={styles.noteList}>
                  {timeline.notes.map(item => (
                    <article className={styles.noteItem} key={item.id}>
                      {editingNote?.id === item.id ? (
                        <form className={styles.noteEditForm} onSubmit={handleUpdateNote}>
                          <textarea
                            rows={3}
                            maxLength={5000}
                            value={editingNote.content}
                            onChange={event => setEditingNote({ ...editingNote, content: event.target.value })}
                            autoFocus
                          />
                          <div className={styles.noteEditActions}>
                            <button type="button" className={styles.noteEditCancel} onClick={() => setEditingNote(null)}>Cancelar</button>
                            <button type="submit" className={styles.noteEditSave} disabled={noteEditSubmitting || !editingNote.content.trim()}>
                              {noteEditSubmitting ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p>{item.content}</p>
                          <div className={styles.noteItemFooter}>
                            <span>{item.updated_by_name ? `Editado por ${item.updated_by_name}` : item.created_by_name} · {formatDate(item.updated_at)}</span>
                            <button
                              className={styles.noteEditButton}
                              onClick={() => setEditingNote({ id: item.id, content: item.content })}
                              title="Editar observação"
                              aria-label="Editar observação"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                  {timeline.notes.length === 0 && <p className={styles.sectionEmpty}>Nenhuma observação registrada.</p>}
                </div>
              </section>

              <section className={styles.drawerSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <FileText size={17} />
                    <h3>Atividades recentes</h3>
                  </div>
                </div>
                <div className={styles.activityList}>
                  {timeline.recent_activity.map((activity, index) => (
                    <article className={styles.activityItem} key={`${activity.kind}-${activity.note_id ?? activity.process_id}-${index}`}>
                      <span className={styles.activityDot} />
                      <div>
                        <strong>{activityTitle(activity.kind, activity.title)}</strong>
                        {activity.content && <p>{activity.content}</p>}
                        <span>{activity.actor_name ?? 'Sistema'} · {formatDate(activity.occurred_at)}</span>
                      </div>
                    </article>
                  ))}
                  {timeline.recent_activity.length === 0 && <p className={styles.sectionEmpty}>Nenhuma atividade recente.</p>}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {anonymizingClient && (
        <Modal title="Anonimizar cliente pela LGPD" onClose={() => setAnonymizingClient(null)} width={520}>
          <div className={styles.anonymizeContent}>
            <div className={styles.dangerNotice}>
              <ShieldAlert size={22} />
              <div>
                <strong>Esta ação é irreversível</strong>
                <p>Dados pessoais e observações serão removidos. Clientes com processos ativos ou suspensos não podem ser anonimizados.</p>
              </div>
            </div>
            <label className={styles.confirmField}>
              <span>Digite <strong>{anonymizingClient.name}</strong> para confirmar</span>
              <input value={anonymizeConfirmation} onChange={event => setAnonymizeConfirmation(event.target.value)} autoComplete="off" />
            </label>
            {anonymizeError && <p className={styles.formError}>{anonymizeError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setAnonymizingClient(null)}>Cancelar</button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void handleAnonymize()}
                disabled={anonymizeSubmitting || anonymizeConfirmation !== anonymizingClient.name}
              >
                <Trash2 size={15} />
                {anonymizeSubmitting ? 'Anonimizando...' : 'Anonimizar definitivamente'}
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
  tone: 'navy' | 'blue' | 'amber' | 'green';
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

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
