import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Pencil, UserX, UserCheck, ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Modal from '../../../components/sistema/Modal/Modal';
import { listUsers, createUser, updateUser, listAuditLogs } from '../../../services/users';
import type { ApiUser, AuditLog, UserRole } from '../../../services/users';
import { ApiError } from '../../../services/api';
import styles from './Usuarios.module.css';

type View = 'lista' | 'registros';
type ModalType = 'novo' | 'ver' | 'editar' | 'desativar' | 'reativar' | null;

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: 'Administrador', USER: 'Usuário' };

const ACTION_LABEL: Record<AuditLog['action'], string> = {
  USER_CREATED: 'Criação de Usuário',
  USER_UPDATED: 'Edição de Usuário',
  USER_DEACTIVATED: 'Desativação de Usuário',
  CLIENT_ANONYMIZED: 'Anonimização de Cliente',
};

const ACTION_COLOR: Record<AuditLog['action'], string> = {
  USER_CREATED: '#4caf50',
  USER_UPDATED: '#1976d2',
  USER_DEACTIVATED: '#ef5350',
  CLIENT_ANONYMIZED: '#ff9800',
};

const LIMIT = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Usuarios() {
  const [view, setView] = useState<View>('lista');

  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [pageUsuarios, setPageUsuarios] = useState(1);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState('');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pageLogs, setPageLogs] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState('');
  const [filterAction, setFilterAction] = useState<AuditLog['action'] | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('USER');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCanViewPayments, setFormCanViewPayments] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsuarios = useCallback(async (page: number) => {
    setLoadingUsuarios(true);
    setErrorUsuarios('');
    try {
      const res = await listUsers({ page, limit: LIMIT });
      setUsuarios(res.data);
      setTotalUsuarios(res.meta.total);
    } catch {
      setErrorUsuarios('Não foi possível carregar os usuários.');
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  const fetchLogs = useCallback(async (
    page: number,
    action?: AuditLog['action'],
    dateFrom?: string,
    dateTo?: string,
  ) => {
    setLoadingLogs(true);
    setErrorLogs('');
    try {
      const res = await listAuditLogs({
        page,
        limit: LIMIT,
        action: action || undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
      });
      setLogs(res.data);
      setTotalLogs(res.meta.total);
    } catch {
      setErrorLogs('Não foi possível carregar os registros.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => { void fetchUsuarios(pageUsuarios); }, [fetchUsuarios, pageUsuarios]);

  useEffect(() => {
    if (view === 'registros') void fetchLogs(
      pageLogs,
      filterAction || undefined,
      filterDateFrom || undefined,
      filterDateTo || undefined,
    );
  }, [fetchLogs, pageLogs, view, filterAction, filterDateFrom, filterDateTo]);

  function openNovo() {
    setFormNome(''); setFormEmail(''); setFormRole('USER'); setFormCanViewPayments(false); setFormError('');
    setModalType('novo');
  }

  function openVer(u: ApiUser) { setSelectedUser(u); setModalType('ver'); }

  function openEditar(u: ApiUser) {
    setSelectedUser(u);
    setFormNome(u.name); setFormEmail(u.email);
    setFormRole(u.role); setFormIsActive(u.is_active); setFormCanViewPayments(u.can_view_payments); setFormError('');
    setModalType('editar');
  }

  function openDesativar(u: ApiUser) { setSelectedUser(u); setFormError(''); setModalType('desativar'); }
  function openReativar(u: ApiUser) { setSelectedUser(u); setFormError(''); setModalType('reativar'); }

  function closeModal() { setModalType(null); setSelectedUser(null); setFormError(''); }

  async function salvarNovo() {
    if (!formNome.trim() || !formEmail.trim()) {
      setFormError('Nome e e-mail são obrigatórios.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const created = await createUser(formNome.trim(), formEmail.trim());
      // POST /api/v1/users sempre cria como USER sem acesso a vencimentos; papel e permissão requerem PATCH subsequente
      const precisaPatch = formRole === 'ADMIN' || formCanViewPayments;
      const final = precisaPatch
        ? (await updateUser(created.data.id, { role: formRole, can_view_payments: formCanViewPayments })).data
        : created.data;
      setUsuarios(prev => [final, ...prev]);
      setTotalUsuarios(prev => prev + 1);
      closeModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? (err.code === 'EMAIL_ALREADY_EXISTS' ? 'Este e-mail já está cadastrado.' : err.message)
          : 'Não foi possível criar o usuário.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function salvarEdicao() {
    if (!selectedUser) return;
    if (!formNome.trim() || !formEmail.trim()) {
      setFormError('Nome e e-mail são obrigatórios.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await updateUser(selectedUser.id, {
        name: formNome.trim(),
        email: formEmail.trim(),
        role: formRole,
        is_active: formIsActive,
        can_view_payments: formCanViewPayments,
      });
      setUsuarios(prev => prev.map(u => u.id === selectedUser.id ? res.data : u));
      closeModal();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? (err.code === 'EMAIL_ALREADY_EXISTS' ? 'Este e-mail já pertence a outro usuário.' : err.message)
          : 'Não foi possível atualizar o usuário.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmarDesativar() {
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await updateUser(selectedUser.id, { is_active: false });
      setUsuarios(prev => prev.map(u => u.id === selectedUser.id ? res.data : u));
      closeModal();
    } catch {
      setFormError('Não foi possível desativar o usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmarReativar() {
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await updateUser(selectedUser.id, { is_active: true });
      setUsuarios(prev => prev.map(u => u.id === selectedUser.id ? res.data : u));
      closeModal();
    } catch {
      setFormError('Não foi possível reativar o usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalPagesUsuarios = Math.max(1, Math.ceil(totalUsuarios / LIMIT));
  const totalPagesLogs = Math.max(1, Math.ceil(totalLogs / LIMIT));

  return (
    <div className={styles.page}>

      {/* ── LISTA ── */}
      {view === 'lista' && (
        <>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Gerenciar Usuários</h1>
            <div className={styles.headerActions}>
              <button className={styles.btnSecondary} onClick={() => setView('registros')}>Registros</button>
              <button className={styles.btnPrimary} onClick={openNovo}>
                <Plus size={16} /> Novo Usuário
              </button>
            </div>
          </div>

          {loadingUsuarios && <p className={styles.statusMsg}>Carregando...</p>}
          {errorUsuarios && <p className={styles.errorMsg}>{errorUsuarios}</p>}

          {!loadingUsuarios && !errorUsuarios && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Papel</th>
                    <th>Status</th>
                    <th>Vencimentos</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 && (
                    <tr><td colSpan={7}><p className={styles.statusMsg}>Nenhum usuário encontrado.</p></td></tr>
                  )}
                  {usuarios.map(u => (
                    <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.6 }}>
                      <td><div className={styles.userName}>{u.name}</div></td>
                      <td className={styles.email}>{u.email}</td>
                      <td>
                        <span
                          className={styles.cargoBadge}
                          style={u.role === 'ADMIN'
                            ? { background: '#fff3e0', color: '#e65100' }
                            : { background: '#e8eaf6', color: '#3949ab' }}
                        >
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.cargoBadge}
                          style={u.is_active
                            ? { background: '#e8f5e9', color: '#2e7d32' }
                            : { background: '#fce4ec', color: '#c62828' }}
                        >
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.cargoBadge}
                          style={u.role === 'ADMIN' || u.can_view_payments
                            ? { background: '#e8f5e9', color: '#2e7d32' }
                            : { background: '#f5f5f5', color: '#757575' }}
                        >
                          {u.role === 'ADMIN' || u.can_view_payments ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td><div className={styles.date}>{formatDate(u.created_at)}</div></td>
                      <td>
                        <div className={styles.acoes}>
                          <button className={styles.iconBtn} onClick={() => openVer(u)} title="Visualizar"><Eye size={16} /></button>
                          <button className={styles.iconBtn} onClick={() => openEditar(u)} title="Editar"><Pencil size={16} /></button>
                          {u.is_active
                            ? <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => openDesativar(u)} title="Desativar"><UserX size={16} /></button>
                            : <button className={styles.iconBtn} onClick={() => openReativar(u)} title="Reativar"><UserCheck size={16} /></button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Mostrando <strong>{usuarios.length}</strong> de <strong>{totalUsuarios}</strong> Usuários
            </span>
            <div className={styles.pageControls}>
              <button className={styles.pageArrow} disabled={pageUsuarios <= 1} onClick={() => setPageUsuarios(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPagesUsuarios }, (_, i) => (
                <button
                  key={i + 1}
                  className={`${styles.pageNum} ${pageUsuarios === i + 1 ? styles.pageActive : ''}`}
                  onClick={() => setPageUsuarios(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className={styles.pageArrow} disabled={pageUsuarios >= totalPagesUsuarios} onClick={() => setPageUsuarios(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── REGISTROS ── */}
      {view === 'registros' && (
        <>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Registros</h1>
            <button className={styles.btnBack} onClick={() => setView('lista')}>
              <ArrowLeft size={16} /> Voltar aos Usuários
            </button>
          </div>

          <div className={styles.filterBar}>
            <select
              className={styles.filterInput}
              value={filterAction}
              onChange={e => { setFilterAction(e.target.value as AuditLog['action'] | ''); setPageLogs(1); }}
            >
              <option value="">Todas as ações</option>
              <option value="USER_CREATED">Criação de Usuário</option>
              <option value="USER_UPDATED">Edição de Usuário</option>
              <option value="USER_DEACTIVATED">Desativação de Usuário</option>
              <option value="CLIENT_ANONYMIZED">Anonimização de Cliente</option>
            </select>

            <div className={styles.filterDateGroup}>
              <span className={styles.filterLabel}>De</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filterDateFrom}
                onChange={e => { setFilterDateFrom(e.target.value); setPageLogs(1); }}
              />
            </div>

            <div className={styles.filterDateGroup}>
              <span className={styles.filterLabel}>Até</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filterDateTo}
                onChange={e => { setFilterDateTo(e.target.value); setPageLogs(1); }}
              />
            </div>

            {(filterAction || filterDateFrom || filterDateTo) && (
              <button
                className={styles.btnBack}
                onClick={() => { setFilterAction(''); setFilterDateFrom(''); setFilterDateTo(''); setPageLogs(1); }}
              >
                <X size={14} /> Limpar
              </button>
            )}
          </div>

          {loadingLogs && <p className={styles.statusMsg}>Carregando...</p>}
          {errorLogs && <p className={styles.errorMsg}>{errorLogs}</p>}

          {!loadingLogs && !errorLogs && (
            <div className={styles.logList}>
              {logs.length === 0 && <p className={styles.statusMsg}>Nenhum registro encontrado.</p>}
              {logs.map(log => {
                const d = new Date(log.created_at);
                const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const afetado = log.target_user_name ?? log.target_client_name ?? '—';
                return (
                  <div key={log.id} className={styles.logItem}>
                    <div className={styles.logDate}>
                      <span className={styles.logDay}>{dia}</span>
                      <span className={styles.logHour}>{hora}</span>
                    </div>
                    <div className={styles.logDivider} />
                    <div className={styles.logContent}>
                      <div className={styles.logDesc}>{ACTION_LABEL[log.action]}</div>
                      <div className={styles.logSub}>Afetado: {afetado}</div>
                    </div>
                    <span className={styles.logBadge} style={{ background: ACTION_COLOR[log.action] }}>
                      {ACTION_LABEL[log.action]}
                    </span>
                    <div className={styles.logExecutor}>
                      <span className={styles.logExecutorLabel}>Executor</span>
                      <span className={styles.logExecutorName}>{log.performed_by_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Mostrando <strong>{logs.length}</strong> de <strong>{totalLogs}</strong> Logs
            </span>
            <div className={styles.pageControls}>
              <button className={styles.pageArrow} disabled={pageLogs <= 1} onClick={() => setPageLogs(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPagesLogs }, (_, i) => (
                <button
                  key={i + 1}
                  className={`${styles.pageNum} ${pageLogs === i + 1 ? styles.pageActive : ''}`}
                  onClick={() => setPageLogs(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className={styles.pageArrow} disabled={pageLogs >= totalPagesLogs} onClick={() => setPageLogs(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL NOVO ── */}
      {modalType === 'novo' && (
        <Modal title="Novo Usuário" onClose={closeModal}>
          <UserFormFields
            nome={formNome} setNome={setFormNome}
            email={formEmail} setEmail={setFormEmail}
            role={formRole} setRole={setFormRole}
            canViewPayments={formCanViewPayments} setCanViewPayments={setFormCanViewPayments}
          />
          <div className={styles.infoBox}>
            <p>O sistema gerará uma senha temporária registrada nos logs do servidor.</p>
          </div>
          {formError && <p className={styles.errorMsg}>{formError}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={closeModal}>Cancelar</button>
            <button className={styles.btnPrimary} onClick={() => void salvarNovo()} disabled={submitting}>
              <Plus size={16} /> {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL VER ── */}
      {modalType === 'ver' && selectedUser && (
        <Modal title="Visualizar Usuário" onClose={closeModal}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nome</label>
            <div className={styles.fieldReadonly}>{selectedUser.name}</div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>E-mail</label>
              <div className={styles.fieldReadonly}>{selectedUser.email}</div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Papel</label>
              <div className={styles.fieldReadonly}>{ROLE_LABEL[selectedUser.role]}</div>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Status</label>
              <div className={styles.fieldReadonly}>{selectedUser.is_active ? 'Ativo' : 'Inativo'}</div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Criado em</label>
              <div className={styles.fieldReadonly}>{formatDate(selectedUser.created_at)}</div>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Pode visualizar vencimentos</label>
            <div className={styles.fieldReadonly}>
              {selectedUser.role === 'ADMIN'
                ? 'Sim (administradores sempre visualizam)'
                : selectedUser.can_view_payments ? 'Sim' : 'Não'}
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL EDITAR ── */}
      {modalType === 'editar' && selectedUser && (
        <Modal title="Editar Usuário" onClose={closeModal}>
          <UserFormFields
            nome={formNome} setNome={setFormNome}
            email={formEmail} setEmail={setFormEmail}
            role={formRole} setRole={setFormRole}
            canViewPayments={formCanViewPayments} setCanViewPayments={setFormCanViewPayments}
          />
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Status</label>
            <select
              className={styles.fieldInput}
              value={formIsActive ? 'ativo' : 'inativo'}
              onChange={e => setFormIsActive(e.target.value === 'ativo')}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          {formError && <p className={styles.errorMsg}>{formError}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={closeModal}>Cancelar</button>
            <button className={styles.btnPrimary} onClick={() => void salvarEdicao()} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL DESATIVAR ── */}
      {modalType === 'desativar' && selectedUser && (
        <Modal title="Desativar Usuário" onClose={closeModal} width={420}>
          <p className={styles.deleteText}>
            Tem certeza que deseja desativar <strong>{selectedUser.name}</strong>?
            O usuário perderá acesso ao sistema.
          </p>
          {formError && <p className={styles.errorMsg}>{formError}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={closeModal}>Cancelar</button>
            <button className={styles.btnDanger} onClick={() => void confirmarDesativar()} disabled={submitting}>
              {submitting ? 'Desativando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL REATIVAR ── */}
      {modalType === 'reativar' && selectedUser && (
        <Modal title="Reativar Usuário" onClose={closeModal} width={420}>
          <p className={styles.deleteText}>
            Tem certeza que deseja reativar <strong>{selectedUser.name}</strong>?
            O usuário voltará a ter acesso ao sistema.
          </p>
          {formError && <p className={styles.errorMsg}>{formError}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={closeModal}>Cancelar</button>
            <button className={styles.btnPrimary} onClick={() => void confirmarReativar()} disabled={submitting}>
              {submitting ? 'Reativando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}

interface UserFormFieldsProps {
  nome: string; setNome: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  role: UserRole; setRole: (v: UserRole) => void;
  canViewPayments: boolean; setCanViewPayments: (v: boolean) => void;
}

function UserFormFields({
  nome, setNome, email, setEmail, role, setRole, canViewPayments, setCanViewPayments,
}: UserFormFieldsProps) {
  const isAdminRole = role === 'ADMIN';
  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Nome Completo</label>
        <input
          className={styles.fieldInput}
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Ana Lima"
        />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>E-mail</label>
          <input
            className={styles.fieldInput}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="exemplo@escritorio.com"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Papel</label>
          <select className={styles.fieldInput} value={role} onChange={e => setRole(e.target.value as UserRole)}>
            <option value="USER">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <label
          className={styles.fieldLabel}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdminRole ? 'default' : 'pointer' }}
        >
          <input
            id="usuario-pode-ver-vencimentos"
            type="checkbox"
            checked={isAdminRole || canViewPayments}
            disabled={isAdminRole}
            onChange={e => setCanViewPayments(e.target.checked)}
          />
          Pode visualizar vencimentos
        </label>
        {isAdminRole && (
          <span style={{ fontSize: '.78rem', color: 'var(--gray)' }}>Administradores sempre visualizam</span>
        )}
      </div>
    </>
  );
}
