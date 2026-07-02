import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Pencil,
  CalendarDays, Clock, LayoutList, Scale, MapPin,
} from 'lucide-react';
import {
  listAppointments, createAppointment, updateAppointment, deleteAppointment,
  type Appointment, type AppointmentType, type AppointmentWrite,
} from '../../../services/appointments';
import {
  getGoogleStatus, getGoogleAuthUrl, disconnectGoogle, syncAllToGoogle, pullFromGoogle,
  type GoogleStatus,
} from '../../../services/googleCalendar';
import { calculateDeadline } from '../../../services/deadlines';
import { listForensicHolidays, type ForensicHoliday } from '../../../services/forensicHolidays';
import { listClients, type ClientListItem } from '../../../services/clients';
import { listProcesses, type ProcessListItem } from '../../../services/processes';
import { ApiError } from '../../../services/api';
import styles from './Agenda.module.css';

// ── Constants ──────────────────────────────────────────────
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_HEADER = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

const TYPE_LABELS: Record<AppointmentType, string> = {
  AUDIENCIA: 'Audiência',
  REUNIAO: 'Reunião',
  PRAZO: 'Prazo',
  OUTRO: 'Outro',
};

const TYPE_COLOR: Record<AppointmentType, string> = {
  AUDIENCIA: '#e65100',
  REUNIAO: '#1565c0',
  PRAZO: '#c62828',
  OUTRO: '#37474f',
};

type PrazoConfig = { label: string; days: number; isCalendar: boolean };

const TIPOS_PRAZO: PrazoConfig[] = [
  { label: 'Apelação Cível (15 dias úteis)',        days: 15,  isCalendar: false },
  { label: 'Contestação (15 dias úteis)',            days: 15,  isCalendar: false },
  { label: 'Recurso Especial (15 dias úteis)',       days: 15,  isCalendar: false },
  { label: 'Embargo de Declaração (5 dias úteis)',   days: 5,   isCalendar: false },
  { label: 'Agravo Interno (15 dias úteis)',         days: 15,  isCalendar: false },
  { label: 'Mandado de Segurança (120 dias corridos)', days: 120, isCalendar: true },
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
function toStartsAt(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}
function fromStartsAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: localYMD(d),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}
function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Não foi possível concluir a operação.';
}

// ── Form state ─────────────────────────────────────────────
type FormState = {
  type: AppointmentType;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  client_id: number | null;
  process_id: number | null;
  description: string;
  location: string;
};

const EMPTY_FORM: FormState = {
  type: 'AUDIENCIA',
  title: '',
  date: '',
  time: '09:00',
  duration_minutes: 60,
  client_id: null,
  process_id: null,
  description: '',
  location: '',
};

function apptToForm(a: Appointment): FormState {
  const { date, time } = fromStartsAt(a.starts_at);
  return {
    type: a.type,
    title: a.title,
    date,
    time,
    duration_minutes: a.duration_minutes,
    client_id: a.client_id,
    process_id: a.process_id,
    description: a.description ?? '',
    location: a.location ?? '',
  };
}

function formToPayload(form: FormState): AppointmentWrite {
  return {
    type: form.type,
    title: form.title.trim() || TYPE_LABELS[form.type],
    starts_at: toStartsAt(form.date, form.time),
    duration_minutes: form.duration_minutes,
    client_id: form.client_id || null,
    process_id: form.process_id || null,
    description: form.description.trim() || null,
    location: form.location.trim() || null,
  };
}

// ── CompromissoModal ───────────────────────────────────────
interface CompromissoModalProps {
  titulo: string;
  initial: FormState;
  clients: ClientListItem[];
  processes: ProcessListItem[];
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: (form: FormState) => void;
}

function CompromissoModal({ titulo, initial, clients, processes, saving, error, onCancel, onSave }: CompromissoModalProps) {
  const [form, setForm] = useState<FormState>(initial);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const valid = Boolean(form.date && form.time && form.duration_minutes >= 1);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{titulo}</h2>
          <button className={styles.modalClose} onClick={onCancel}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.mField}>
            <label className={styles.mLabel}>TIPO DO COMPROMISSO</label>
            <select className={styles.mSelect} value={form.type} onChange={e => update('type', e.target.value as AppointmentType)}>
              {(Object.entries(TYPE_LABELS) as [AppointmentType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>TÍTULO (OPCIONAL)</label>
            <input
              className={styles.mInput}
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder={`Ex: ${TYPE_LABELS[form.type]} — Caso Silva`}
            />
          </div>
          <div className={styles.mRow3}>
            <div className={styles.mField}>
              <label className={styles.mLabel}>DATA</label>
              <input className={styles.mInput} type="date" value={form.date} onChange={e => update('date', e.target.value)} />
            </div>
            <div className={styles.mField}>
              <label className={styles.mLabel}>INÍCIO</label>
              <input className={styles.mInput} type="time" value={form.time} onChange={e => update('time', e.target.value)} />
            </div>
            <div className={styles.mField}>
              <label className={styles.mLabel}>DURAÇÃO (min)</label>
              <input className={styles.mInput} type="number" min={1} max={1440} value={form.duration_minutes} onChange={e => update('duration_minutes', Number(e.target.value))} />
            </div>
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>CLIENTE (OPCIONAL)</label>
            <select
              className={styles.mSelect}
              value={form.client_id ?? ''}
              onChange={e => update('client_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sem cliente vinculado</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>PROCESSO (OPCIONAL)</label>
            <select
              className={styles.mSelect}
              value={form.process_id ?? ''}
              onChange={e => update('process_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sem processo vinculado</option>
              {processes.map(p => <option key={p.id} value={p.id}>{p.number} — {p.action_type}</option>)}
            </select>
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>LOCAL</label>
            <input
              className={styles.mInput}
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder="Ex: Fórum Central, Sala 3"
            />
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>OBSERVAÇÕES</label>
            <textarea
              className={styles.mTextarea}
              rows={3}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onCancel}>Cancelar</button>
          <button className={styles.btnSave} onClick={() => onSave(form)} disabled={!valid || saving}>
            {saving ? 'Salvando...' : 'Salvar Evento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DetalhesModal ──────────────────────────────────────────
interface DetalhesModalProps {
  appointment: Appointment;
  clients: ClientListItem[];
  processes: ProcessListItem[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DetalhesModal({ appointment: a, clients, processes, onClose, onEdit, onDelete }: DetalhesModalProps) {
  const { date, time } = fromStartsAt(a.starts_at);
  const dateFmt = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const color = TYPE_COLOR[a.type];
  const clientName = clients.find(c => c.id === a.client_id)?.name ?? null;
  const proc = processes.find(p => p.id === a.process_id) ?? null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detalhesModal} onClick={e => e.stopPropagation()}>
        <button className={styles.detalhesClose} onClick={onClose}><X size={16} /></button>
        <span className={styles.detalhesTipoBadge} style={{ background: `${color}18`, color }}>
          {TYPE_LABELS[a.type].toUpperCase()}
        </span>
        <h2 className={styles.detalhesTitulo}>{a.title}</h2>

        <div className={styles.detalhesRow}>
          <div className={styles.detalhesItem}>
            <CalendarDays size={16} className={styles.detalhesIcon} />
            <div>
              <p className={styles.detalhesLabel}>DATA</p>
              <p className={styles.detalhesVal}>{dateFmt}</p>
            </div>
          </div>
          <div className={styles.detalhesItem}>
            <Clock size={16} className={styles.detalhesIcon} />
            <div>
              <p className={styles.detalhesLabel}>HORÁRIO</p>
              <p className={styles.detalhesVal}>{time} · {a.duration_minutes} min</p>
            </div>
          </div>
        </div>

        {(clientName || proc || a.location) && (
          <div className={styles.detalhesInfoCard}>
            {clientName && (
              <div className={styles.detalhesInfoItem}>
                <LayoutList size={15} className={styles.detalhesInfoIcon} />
                <div>
                  <p className={styles.detalhesLabel}>CLIENTE</p>
                  <p className={styles.detalhesInfoVal}>{clientName}</p>
                </div>
              </div>
            )}
            {proc && (
              <div className={styles.detalhesInfoItem}>
                <Scale size={15} className={styles.detalhesInfoIcon} />
                <div>
                  <p className={styles.detalhesLabel}>PROCESSO</p>
                  <p className={styles.detalhesInfoVal}>{proc.number}</p>
                </div>
              </div>
            )}
            {a.location && (
              <div className={styles.detalhesInfoItem}>
                <MapPin size={15} className={styles.detalhesInfoIcon} />
                <div>
                  <p className={styles.detalhesLabel}>LOCAL</p>
                  <p className={styles.detalhesInfoVal}>{a.location}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {a.description && (
          <div className={styles.detalhesObs}>
            <p className={styles.detalhesObsLabel}><LayoutList size={13} /> OBSERVAÇÕES</p>
            <blockquote className={styles.detalhesObsText}>"{a.description}"</blockquote>
          </div>
        )}

        <div className={styles.detalhesActions}>
          <button className={styles.btnExcluir} onClick={onDelete}><Trash2 size={15} /> Excluir</button>
          <button className={styles.btnEditar} onClick={onEdit}><Pencil size={15} /> Editar</button>
        </div>
      </div>
    </div>
  );
}

// ── CalcModal ──────────────────────────────────────────────
interface CalcModalProps {
  onClose: () => void;
  onAppointmentCreated: (a: Appointment) => void;
}

function CalcModal({ onClose, onAppointmentCreated }: CalcModalProps) {
  const [dataInt, setDataInt] = useState('');
  const [tipoPrazo, setTipoPrazo] = useState(TIPOS_PRAZO[0].label);
  const [tribunal, setTribunal] = useState('');
  const [comarca, setComarca] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [resultado, setResultado] = useState<{
    dataLimite: string;
    diasRestantes: number;
    dueDate: string;
    skippedHolidays: number;
    isCalendar: boolean;
  } | null>(null);

  async function calcular() {
    if (!dataInt) return;
    setCalculating(true);
    setCalcError('');
    setResultado(null);
    try {
      const config = TIPOS_PRAZO.find(t => t.label === tipoPrazo)!;
      let dueDateStr: string;
      let skippedHolidays = 0;
      if (config.isCalendar) {
        const d = new Date(dataInt + 'T12:00:00');
        d.setDate(d.getDate() + config.days);
        dueDateStr = localYMD(d);
      } else {
        const result = await calculateDeadline({
          start_date: dataInt,
          business_days: config.days,
          court: tribunal.trim() || null,
          comarca: comarca.trim() || null,
        });
        dueDateStr = result.due_date;
        skippedHolidays = result.skipped_days.filter(d => d.reason === 'HOLIDAY').length;
      }
      const dueDate = new Date(dueDateStr + 'T12:00:00');
      const hoje = new Date();
      const diff = Math.max(0, Math.ceil((dueDate.getTime() - hoje.getTime()) / 86400000));
      setResultado({
        dataLimite: dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
        diasRestantes: diff,
        dueDate: dueDateStr,
        skippedHolidays,
        isCalendar: config.isCalendar,
      });
    } catch (e) {
      setCalcError(errMsg(e));
    } finally {
      setCalculating(false);
    }
  }

  async function salvar() {
    if (!resultado) return;
    setSaving(true);
    setCalcError('');
    try {
      const tipoLabel = tipoPrazo.split('(')[0].trim();
      const created = await createAppointment({
        type: 'PRAZO',
        title: `Prazo: ${tipoLabel}`,
        starts_at: new Date(`${resultado.dueDate}T23:59`).toISOString(),
        duration_minutes: 1,
        description: comarca.trim() ? `Comarca: ${comarca.trim()}` : null,
      });
      onAppointmentCreated(created);
      onClose();
    } catch (e) {
      setCalcError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.calcWrapper} onClick={e => e.stopPropagation()}>
        <div className={styles.calcForm}>
          <div className={styles.calcHeader}>
            <CalendarDays size={20} className={styles.calcHeaderIcon} />
            <h2 className={styles.calcTitle}>Calcular Prazo Processual</h2>
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>DATA DE INTIMAÇÃO</label>
            <input className={styles.mInput} type="date" value={dataInt} onChange={e => setDataInt(e.target.value)} />
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>TIPO DE PRAZO</label>
            <select className={styles.mSelect} value={tipoPrazo} onChange={e => { setTipoPrazo(e.target.value); setResultado(null); }}>
              {TIPOS_PRAZO.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
            </select>
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>TRIBUNAL (OPCIONAL)</label>
            <input
              className={styles.mInput}
              value={tribunal}
              onChange={e => setTribunal(e.target.value)}
              placeholder="Ex: TJSP, TJDFT"
            />
          </div>
          <div className={styles.mField}>
            <label className={styles.mLabel}>COMARCA (OPCIONAL)</label>
            <input
              className={styles.mInput}
              value={comarca}
              onChange={e => setComarca(e.target.value)}
              placeholder="Ex: Capital, Brasília"
            />
            <small className={styles.fieldHint}>Feriados forenses do tribunal e comarca serão considerados.</small>
          </div>
          <button
            className={styles.btnSave}
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => void calcular()}
            disabled={!dataInt || calculating}
          >
            {calculating ? 'Calculando...' : 'Calcular Agora'}
          </button>
        </div>

        <div className={styles.calcResultado}>
          <button className={styles.calcClose} onClick={onClose}><X size={16} /></button>
          {resultado ? (
            <>
              <p className={styles.calcResultLabel}>RESULTADO</p>
              <p className={styles.calcResultSubLabel}>DATA-LIMITE</p>
              <p className={styles.calcResultDate}>{resultado.dataLimite}</p>
              <p className={styles.calcResultSubLabel}>DIAS RESTANTES</p>
              <div className={styles.calcResultDias}>
                <span className={styles.calcResultNum}>{String(resultado.diasRestantes).padStart(2, '0')}</span>
                <span className={styles.calcResultDiasLabel}>DIAS</span>
              </div>
              {resultado.isCalendar
                ? <p className={styles.calcSkipNote}>Prazo em dias corridos — fins de semana e feriados não suspendem.</p>
                : resultado.skippedHolidays > 0 && (
                  <p className={styles.calcSkipNote}>
                    {resultado.skippedHolidays} feriado{resultado.skippedHolidays > 1 ? 's' : ''} forense{resultado.skippedHolidays > 1 ? 's' : ''} considerado{resultado.skippedHolidays > 1 ? 's' : ''}.
                  </p>
                )
              }
              {calcError && <p className={styles.calcError}>{calcError}</p>}
              <button className={styles.btnSalvarAgenda} onClick={() => void salvar()} disabled={saving}>
                <CalendarDays size={15} /> {saving ? 'Salvando...' : 'Salvar na Agenda'}
              </button>
            </>
          ) : (
            <>
              <p className={styles.calcResultLabel}>RESULTADO</p>
              {calcError
                ? <p className={styles.calcError}>{calcError}</p>
                : <p className={styles.calcResultEmpty}>Preencha os campos e clique em Calcular Agora.</p>
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MobileDayModal ─────────────────────────────────────────
interface MobileDayModalProps {
  date: string;
  events: Appointment[];
  onClose: () => void;
  onSelectEvent: (ev: Appointment) => void;
  onNewEvent: (date: string) => void;
}

function MobileDayModal({ date, events, onClose, onSelectEvent, onNewEvent }: MobileDayModalProps) {
  const dateFmt = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return (
    <div className={styles.overlayBottom} onClick={onClose}>
      <div className={styles.mobileDaySheet} onClick={e => e.stopPropagation()}>
        <div className={styles.mobileDayHandle} />
        <div className={styles.mobileDayHeader}>
          <span className={styles.mobileDayDate}>{dateFmt}</span>
          <button className={styles.mobileDayClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.mobileDayList}>
          {events.map(ev => {
            const color = TYPE_COLOR[ev.type];
            const { time } = fromStartsAt(ev.starts_at);
            return (
              <button
                key={ev.id}
                className={styles.mobileDayItem}
                style={{ borderLeft: `3px solid ${color}` }}
                onClick={() => onSelectEvent(ev)}
              >
                <span className={styles.mobileDayItemTime}>{time}</span>
                <div className={styles.mobileDayItemInfo}>
                  <span className={styles.mobileDayItemBadge} style={{ color, background: `${color}18` }}>
                    {TYPE_LABELS[ev.type]}
                  </span>
                  <span className={styles.mobileDayItemTitle}>{ev.title}</span>
                </div>
              </button>
            );
          })}
        </div>
        <button className={styles.mobileDayAddBtn} onClick={() => onNewEvent(date)}>
          <Plus size={15} /> Novo Compromisso
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Agenda() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [holidays, setHolidays] = useState<ForensicHoliday[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [processes, setProcesses] = useState<ProcessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [modal, setModal] = useState<'novo' | 'editar' | 'detalhes' | 'calc' | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [clickDate, setClickDate] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [mobileDayModal, setMobileDayModal] = useState<{ date: string; events: Appointment[] } | null>(null);

  // Google Calendar
  const [searchParams, setSearchParams] = useSearchParams();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    void getGoogleStatus()
      .then(s => setGoogleStatus(s))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const result = searchParams.get('google_calendar');
    if (result === 'connected') {
      setGoogleMsg({ kind: 'ok', text: 'Google Calendar conectado com sucesso!' });
      void getGoogleStatus().then(s => setGoogleStatus(s)).catch(() => {});
    } else if (result === 'error') {
      setGoogleMsg({ kind: 'err', text: 'Não foi possível conectar o Google Calendar.' });
    }
    if (result) {
      searchParams.delete('google_calendar');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  async function handleGoogleConnect() {
    setGoogleBusy(true);
    setGoogleMsg(null);
    try {
      const url = await getGoogleAuthUrl();
      window.location.assign(url);
    } catch {
      setGoogleMsg({ kind: 'err', text: 'Não foi possível iniciar a conexão com o Google.' });
      setGoogleBusy(false);
    }
  }

  async function handleGoogleDisconnect() {
    setGoogleBusy(true);
    setGoogleMsg(null);
    try {
      await disconnectGoogle();
      setGoogleStatus({ connected: false, connected_at: null, scope: null });
      setGoogleMsg({ kind: 'ok', text: 'Google Calendar desconectado.' });
    } catch {
      setGoogleMsg({ kind: 'err', text: 'Não foi possível desconectar.' });
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleGoogleSync() {
    setGoogleBusy(true);
    setGoogleMsg(null);
    try {
      // Bidirecional: primeiro empurra os pendentes, depois puxa o que mudou
      // no Google. Push antes evita que um compromisso recém-criado local
      // seja tratado como novidade na volta.
      const pushed = await syncAllToGoogle();
      const pulled = await pullFromGoogle();

      const parts: string[] = [];
      if (pushed.synced > 0) parts.push(`${pushed.synced} enviado${pushed.synced !== 1 ? 's' : ''}`);
      if (pulled.created > 0) parts.push(`${pulled.created} importado${pulled.created !== 1 ? 's' : ''}`);
      if (pulled.updated > 0) parts.push(`${pulled.updated} atualizado${pulled.updated !== 1 ? 's' : ''}`);
      if (pulled.deleted > 0) parts.push(`${pulled.deleted} removido${pulled.deleted !== 1 ? 's' : ''}`);
      const summary = parts.length > 0 ? parts.join(', ') : 'nada a sincronizar';
      const failedSuffix = pushed.failed > 0 ? ` (${pushed.failed} falha${pushed.failed !== 1 ? 's' : ''} no envio)` : '';

      setGoogleMsg({ kind: 'ok', text: `Sincronização concluída: ${summary}.${failedSuffix}` });

      // Recarrega para exibir os compromissos importados do Google.
      if (pulled.created > 0 || pulled.updated > 0 || pulled.deleted > 0) {
        await loadYear(year);
      }
    } catch {
      setGoogleMsg({ kind: 'err', text: 'Erro ao sincronizar com o Google Calendar.' });
    } finally {
      setGoogleBusy(false);
    }
  }

  const loadYear = useCallback(async (y: number) => {
    setLoading(true);
    setPageError('');
    try {
      const [apptRes, clientRes, procRes, holidayRes] = await Promise.all([
        listAppointments({
          date_from: `${y}-01-01T00:00:00Z`,
          date_to: `${y}-12-31T23:59:59Z`,
        }),
        listClients({ limit: 100 }),
        listProcesses({ limit: 100 }),
        listForensicHolidays({ year: y, limit: 500 }),
      ]);
      setAppointments(apptRes.data);
      setClients(clientRes.data);
      setProcesses(procRes.data);
      setHolidays(holidayRes.data);
    } catch {
      setPageError('Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadYear(year); }, [year, loadYear]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  async function handleCreate(form: FormState) {
    setFormSaving(true);
    setFormError('');
    try {
      const created = await createAppointment(formToPayload(form));
      setAppointments(prev => [...prev, created]);
      setModal(null);
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setFormSaving(false);
    }
  }

  async function handleUpdate(form: FormState) {
    if (!selected) return;
    setFormSaving(true);
    setFormError('');
    try {
      const updated = await updateAppointment(selected.id, formToPayload(form));
      setAppointments(prev => prev.map(a => a.id === selected.id ? updated : a));
      setModal(null);
      setSelected(null);
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setFormSaving(true);
    try {
      await deleteAppointment(selected.id);
      setAppointments(prev => prev.filter(a => a.id !== selected.id));
      setModal(null);
      setSelected(null);
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setFormSaving(false);
    }
  }

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;
  const todayYMD = localYMD(today);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Agenda Jurídica</h1>
        <div className={styles.headerRight}>
          <div className={styles.monthNav}>
            <button className={styles.monthBtn} onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span className={styles.monthLabel}>{MESES[month]} {year}</span>
            <button className={styles.monthBtn} onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>
          <button className={styles.btnCalc} onClick={() => setModal('calc')}>
            <CalendarDays size={16} /> Calcular Prazo
          </button>
          <button className={styles.btnPrimary} onClick={() => { setClickDate(''); setFormError(''); setModal('novo'); }}>
            <Plus size={16} /> Novo Compromisso
          </button>
        </div>
      </div>

      {pageError && <p className={styles.pageError}>{pageError}</p>}

      {googleStatus !== null && (
        <div className={`${styles.gcalBanner} ${googleStatus.connected ? styles.gcalConnected : styles.gcalDisconnected}`}>
          <div className={styles.gcalLeft}>
            <CalendarDays size={18} className={styles.gcalIcon} />
            {googleStatus.connected ? (
              <span className={styles.gcalText}>Google Calendar conectado — compromissos criados aqui serão sincronizados automaticamente.</span>
            ) : (
              <span className={styles.gcalText}>Conecte o Google Calendar para sincronizar seus compromissos automaticamente.</span>
            )}
          </div>
          <div className={styles.gcalActions}>
            {googleMsg && (
              <span className={googleMsg.kind === 'ok' ? styles.gcalOk : styles.gcalErr}>
                {googleMsg.text}
              </span>
            )}
            {googleStatus.connected ? (
              <>
                <button className={styles.gcalBtnSecondary} onClick={() => void handleGoogleSync()} disabled={googleBusy}>
                  {googleBusy ? 'Sincronizando...' : 'Sincronizar agora'}
                </button>
                <button className={styles.gcalBtnDanger} onClick={() => void handleGoogleDisconnect()} disabled={googleBusy}>
                  Desconectar
                </button>
              </>
            ) : (
              <button className={styles.gcalBtnPrimary} onClick={() => void handleGoogleConnect()} disabled={googleBusy}>
                {googleBusy ? 'Aguarde...' : 'Conectar Google Calendar'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.calendar}>
        <div className={styles.calHeader}>
          {DIAS_SEMANA_HEADER.map(d => <div key={d} className={styles.calHeaderCell}>{d}</div>)}
        </div>
        {loading ? (
          <div className={styles.calLoading}>Carregando agenda...</div>
        ) : (
          <div className={styles.calGrid}>
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDayOfWeek + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const ymd = isValid ? toYMD(year, month, dayNum) : '';
              const isToday = ymd === todayYMD;
              const events = isValid
                ? appointments.filter(a => fromStartsAt(a.starts_at).date === ymd)
                : [];
              const dayHolidays = isValid
                ? holidays.filter(h => h.date === ymd)
                : [];

              return (
                <div
                  key={i}
                  className={`${styles.calCell} ${isToday ? styles.calCellToday : ''} ${!isValid ? styles.calCellEmpty : ''}`}
                  onClick={() => {
                    if (!isValid) return;
                    if (events.length > 0 && window.innerWidth <= 480) {
                      setMobileDayModal({ date: ymd, events });
                    } else {
                      setClickDate(ymd);
                      setFormError('');
                      setModal('novo');
                    }
                  }}
                >
                  {isValid && (
                    <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{dayNum}</span>
                  )}
                  {dayHolidays.map(h => (
                    <div key={`holiday-${h.id}`} className={styles.holidayChip} title={h.description}>
                      {h.description}
                    </div>
                  ))}
                  {events.slice(0, 3).map(ev => {
                    const color = TYPE_COLOR[ev.type];
                    const isPrazo = ev.type === 'PRAZO';
                    const { time } = fromStartsAt(ev.starts_at);
                    return (
                      <div
                        key={ev.id}
                        className={`${styles.eventChip} ${isPrazo ? styles.eventChipPrazo : ''}`}
                        style={isPrazo
                          ? { color, background: `${color}12`, borderLeft: `3px solid ${color}` }
                          : { background: color }
                        }
                        onClick={e => { e.stopPropagation(); setSelected(ev); setModal('detalhes'); }}
                      >
                        {!isPrazo && <span className={styles.eventTime}>{time} </span>}
                        {ev.title}
                      </div>
                    );
                  })}
                  {events.length > 3 && (
                    <div className={styles.eventOverflow}>+{events.length - 3} mais</div>
                  )}
                  {(events.length > 0 || dayHolidays.length > 0) && (
                    <div className={styles.eventDots}>
                      {[
                        ...dayHolidays.map(h  => ({ key: `hdot-${h.id}`,  color: '#f9a825' })),
                        ...events.map(ev => ({ key: `dot-${ev.id}`, color: TYPE_COLOR[ev.type] })),
                      ].slice(0, 4).map(dot => (
                        <span key={dot.key} className={styles.eventDot} style={{ background: dot.color }} />
                      ))}
                      {(events.length + dayHolidays.length) > 4 && (
                        <span className={styles.eventDotExtra}>+{events.length + dayHolidays.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal === 'novo' && (
        <CompromissoModal
          titulo="Novo Compromisso"
          initial={{ ...EMPTY_FORM, date: clickDate }}
          clients={clients}
          processes={processes}
          saving={formSaving}
          error={formError}
          onCancel={() => { setModal(null); setFormError(''); }}
          onSave={form => void handleCreate(form)}
        />
      )}

      {modal === 'detalhes' && selected && (
        <DetalhesModal
          appointment={selected}
          clients={clients}
          processes={processes}
          onClose={() => { setModal(null); setSelected(null); }}
          onEdit={() => { setFormError(''); setModal('editar'); }}
          onDelete={() => void handleDelete()}
        />
      )}

      {modal === 'editar' && selected && (
        <CompromissoModal
          titulo="Editar Compromisso"
          initial={apptToForm(selected)}
          clients={clients}
          processes={processes}
          saving={formSaving}
          error={formError}
          onCancel={() => { setModal('detalhes'); setFormError(''); }}
          onSave={form => void handleUpdate(form)}
        />
      )}

      {modal === 'calc' && (
        <CalcModal
          onClose={() => setModal(null)}
          onAppointmentCreated={a => setAppointments(prev => [...prev, a])}
        />
      )}

      {mobileDayModal && (
        <MobileDayModal
          date={mobileDayModal.date}
          events={mobileDayModal.events}
          onClose={() => setMobileDayModal(null)}
          onSelectEvent={ev => { setMobileDayModal(null); setSelected(ev); setModal('detalhes'); }}
          onNewEvent={date => { setMobileDayModal(null); setClickDate(date); setFormError(''); setModal('novo'); }}
        />
      )}
    </div>
  );
}
