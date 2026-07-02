import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../services/api';
import { login, requestPasswordReset } from '../../services/auth';
import styles from './Auth.module.css';

type Tela = 'login' | 'esqueci' | 'solicitado';

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  icon,
  error = false,
  placeholder,
  showToggle = false,
  show = false,
  onToggle,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  error?: boolean;
  placeholder?: string;
  showToggle?: boolean;
  show?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={styles.fieldWrap}>
      <span className={`${styles.fieldLabel} ${error ? styles.fieldLabelError : ''}`}>{label}</span>
      <div className={`${styles.fieldInner} ${error ? styles.fieldInnerError : ''}`}>
        <span className={styles.fieldIcon}>{icon}</span>
        <input
          className={styles.fieldInput}
          type={showToggle ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        />
        {showToggle && (
          <button type="button" className={styles.eyeBtn} onClick={onToggle} tabIndex={-1}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tela, setTela] = useState<Tela>('login');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailRec, setEmailRec] = useState('');
  const [erroRec, setErroRec] = useState('');

  async function handleLogin() {
    setLoading(true);
    setErroLogin('');
    try {
      await login(email, senha);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/sistema', { replace: true });
    } catch (error) {
      setErroLogin(
        error instanceof ApiError && error.status >= 500
          ? 'A API está indisponível no momento.'
          : 'E-mail ou senha incorretos.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleEsqueci() {
    setLoading(true);
    setErroRec('');
    try {
      await requestPasswordReset(emailRec);
      setTela('solicitado');
    } catch {
      setErroRec('Não foi possível solicitar a redefinição agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.bg}>
      <div className={styles.logo}>
        <img src="/logo-dark.png" alt="Vitor França" className={styles.logoImg} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardBar} />
        <div className={styles.cardBody}>
          {/* ── LOGIN ── */}
          {tela === 'login' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
              <h1 className={styles.cardTitle}>Login</h1>

              <InputField
                label="E-MAIL"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setErroLogin('');
                }}
                icon={<Mail size={16} />}
                error={Boolean(erroLogin)}
                placeholder="seu@email.com"
              />

              <InputField
                label="SENHA"
                value={senha}
                onChange={(v) => { setSenha(v); setErroLogin(''); }}
                icon={<Lock size={16} />}
                error={Boolean(erroLogin)}
                placeholder="••••••••••••"
                showToggle
                show={showSenha}
                onToggle={() => setShowSenha(s => !s)}
              />

              <div className={styles.forgotRow}>
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={() => {
                    setEmailRec(email);
                    setTela('esqueci');
                    setErroLogin('');
                  }}
                >
                  Esqueci minha Senha
                </button>
              </div>

              <button
                type="submit"
                className={styles.btnSubmit}
                disabled={loading || !email || !senha}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              {erroLogin && <p className={styles.errorMsg}>{erroLogin}</p>}
            </form>
          )}

          {/* ── ESQUECI SENHA ── */}
          {tela === 'esqueci' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleEsqueci(); }}>
              <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
                Esqueci minha senha
              </h1>
              <p className={styles.cardSubtitle}>Informe o e-mail para o qual deseja redefinir sua senha</p>

              <InputField
                label="E-MAIL"
                type="email"
                value={emailRec}
                onChange={(v) => {
                  setEmailRec(v);
                  setErroRec('');
                }}
                icon={<Mail size={16} />}
                error={Boolean(erroRec)}
                placeholder="seu@email.com"
              />

              <button type="submit" className={styles.btnSubmit} disabled={loading || !emailRec}>
                {loading ? 'Enviando...' : 'Enviar'}
              </button>

              {erroRec && <p className={styles.errorMsg}>{erroRec}</p>}

              <button type="button" className={styles.backLink} onClick={() => setTela('login')}>
                <ArrowLeft size={14} /> Voltar para Login
              </button>
            </form>
          )}

          {tela === 'solicitado' && (
            <>
              <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
                Verifique seu e-mail
              </h1>
              <p className={styles.successMsg}>
                Se o endereço estiver cadastrado, você receberá as instruções para redefinir sua senha.
              </p>

              <button
                className={styles.backLink}
                onClick={() => {
                  setTela('login');
                  setEmailRec('');
                }}
              >
                <ArrowLeft size={14} /> Voltar para Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
