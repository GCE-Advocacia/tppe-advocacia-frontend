import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react';
import { ApiError } from '../../services/api';
import { acceptInvite, getInvite, type InviteInfo } from '../../services/invites';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import styles from './Auth.module.css';
import own from './Convite.module.css';

type LinkState = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'error';

const MIN_LENGTH = 8;

const REQUIREMENTS = [
  { label: `Pelo menos ${MIN_LENGTH} caracteres`, test: (s: string) => s.length >= MIN_LENGTH, required: true },
  { label: 'Letra maiúscula e minúscula', test: (s: string) => /[a-z]/.test(s) && /[A-Z]/.test(s), required: false },
  { label: 'Um número', test: (s: string) => /\d/.test(s), required: false },
  { label: 'Um símbolo (!@#$...)', test: (s: string) => /[^A-Za-z0-9]/.test(s), required: false },
];

const STRENGTH = [
  { label: 'Muito fraca', color: '#c62828' },
  { label: 'Fraca', color: '#ef6c00' },
  { label: 'Razoável', color: '#f9a825' },
  { label: 'Boa', color: '#7cb342' },
  { label: 'Forte', color: '#2e7d32' },
];

function strength(password: string): number {
  if (!password) return 0;
  const score = REQUIREMENTS.filter(r => r.test(password)).length + (password.length >= 12 ? 1 : 0);
  return Math.min(4, Math.max(0, score - 1));
}

function PasswordField({
  label, value, onChange, show, onToggle, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.fieldInner}>
        <span className={styles.fieldIcon}><Lock size={16} /></span>
        <input
          className={styles.fieldInput}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle} tabIndex={-1} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

const LINK_MESSAGE: Record<Exclude<LinkState, 'loading' | 'valid'>, { title: string; text: string }> = {
  expired: {
    title: 'Convite expirado',
    text: 'Este link de convite expirou. Peça ao administrador do sistema para enviar um novo convite.',
  },
  used: {
    title: 'Convite já utilizado',
    text: 'Este convite já foi usado para definir a senha. Entre com seu e-mail e senha.',
  },
  invalid: {
    title: 'Convite inválido',
    text: 'Este link não é válido ou foi substituído por um convite mais novo. Confira o último e-mail recebido ou peça um novo convite ao administrador.',
  },
  error: {
    title: 'Não foi possível abrir o convite',
    text: 'A API está indisponível no momento. Tente novamente em alguns minutos.',
  },
};

function stateFromError(err: unknown): LinkState {
  if (err instanceof ApiError) {
    if (err.code === 'INVITE_EXPIRED') return 'expired';
    if (err.code === 'INVITE_ALREADY_USED') return 'used';
    if (err.status === 404) return 'invalid';
  }
  return 'error';
}

export default function Convite() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<LinkState>('loading');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getInvite(token)
      .then(info => { setInvite(info); setState('valid'); })
      .catch(err => setState(stateFromError(err)));
  }, [token]);

  const score = strength(senha);
  const meetsRequired = REQUIREMENTS.filter(r => r.required).every(r => r.test(senha));
  const matches = senha.length > 0 && senha === confirma;

  async function handleSubmit() {
    setErro('');
    if (!meetsRequired) { setErro(`A senha deve ter no mínimo ${MIN_LENGTH} caracteres.`); return; }
    if (!matches) { setErro('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      await acceptInvite(token, senha);
      navigate('/sistema', { replace: true });
    } catch (err) {
      const next = stateFromError(err);
      if (next === 'error' && err instanceof ApiError && err.status < 500) {
        setErro(err.message);
      } else {
        setState(next);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.bg}>
      <div className={styles.logo}>
        <BrandLogo scope="system" background="light" className={styles.logoImg} />
      </div>
      <div className={styles.card}>
        <div className={styles.cardBar} />
        <div className={styles.cardBody}>
          {state === 'loading' && <p className={styles.cardSubtitle}>Validando convite...</p>}

          {state !== 'loading' && state !== 'valid' && (
            <>
              <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
                {LINK_MESSAGE[state].title}
              </h1>
              <p className={state === 'used' ? styles.successMsg : styles.errorMsg}>{LINK_MESSAGE[state].text}</p>
              <button className={styles.backLink} onClick={() => navigate('/login')}>
                Ir para Login
              </button>
            </>
          )}

          {state === 'valid' && invite && (
            <form onSubmit={e => { e.preventDefault(); void handleSubmit(); }}>
              <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
                Bem-vindo(a), {invite.name}
              </h1>
              <p className={styles.cardSubtitle}>
                Defina a senha de acesso para <strong>{invite.email}</strong>.
              </p>

              <PasswordField
                label="SENHA"
                value={senha}
                onChange={v => { setSenha(v); setErro(''); }}
                show={showSenha}
                onToggle={() => setShowSenha(s => !s)}
                placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
              />

              <div className={own.meter} aria-live="polite">
                <div className={own.meterTrack}>
                  <div
                    className={own.meterFill}
                    style={{
                      width: senha ? `${((score + 1) / STRENGTH.length) * 100}%` : '0%',
                      background: STRENGTH[score].color,
                    }}
                  />
                </div>
                {senha && <span className={own.meterLabel} style={{ color: STRENGTH[score].color }}>{STRENGTH[score].label}</span>}
              </div>

              <ul className={own.requirements}>
                {REQUIREMENTS.map(r => {
                  const ok = r.test(senha);
                  return (
                    <li key={r.label} className={ok ? own.reqOk : own.reqPending}>
                      {ok ? <Check size={14} /> : <X size={14} />}
                      {r.label}{!r.required && <span className={own.optional}> (recomendado)</span>}
                    </li>
                  );
                })}
              </ul>

              <PasswordField
                label="CONFIRMAR SENHA"
                value={confirma}
                onChange={v => { setConfirma(v); setErro(''); }}
                show={showConfirma}
                onToggle={() => setShowConfirma(s => !s)}
                placeholder="Repita a senha"
              />

              <button type="submit" className={styles.btnSubmit} disabled={loading || !meetsRequired || !matches}>
                {loading ? 'Salvando...' : 'Definir senha e entrar'}
              </button>

              {erro && <p className={styles.errorMsg}>{erro}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
