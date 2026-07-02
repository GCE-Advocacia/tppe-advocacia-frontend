import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../services/api';
import { confirmPasswordReset } from '../../services/auth';
import styles from './Auth.module.css';

function InputField({
  label,
  value,
  onChange,
  error = false,
  placeholder,
  show = false,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  placeholder?: string;
  show?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={styles.fieldWrap}>
      <span className={`${styles.fieldLabel} ${error ? styles.fieldLabelError : ''}`}>{label}</span>
      <div className={`${styles.fieldInner} ${error ? styles.fieldInnerError : ''}`}>
        <span className={styles.fieldIcon}>
          <Lock size={16} />
        </span>
        <input
          className={styles.fieldInput}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  if (!token) {
    return (
      <div className={styles.bg}>
        <div className={styles.logo}>
          <img src="/logo-dark.png" alt="Vitor França" className={styles.logoImg} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardBar} />
          <div className={styles.cardBody}>
            <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
              Link inválido
            </h1>
            <p className={styles.errorMsg}>
              O link de redefinição é inválido ou está incompleto. Solicite um novo link.
            </p>
            <button className={styles.backLink} onClick={() => navigate('/login')}>
              Voltar para Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    setErro('');
    if (!token) {
      setErro('Link inválido ou incompleto.');
      return;
    }
    if (novaSenha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (novaSenha !== confirma) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(token, novaSenha);
      setSucesso(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'INVALID_RESET_TOKEN') {
          setErro('Link expirado ou inválido. Solicite um novo e-mail de redefinição.');
        } else if (error.status >= 500) {
          setErro('A API está indisponível no momento.');
        } else {
          setErro('Não foi possível redefinir a senha. Tente novamente.');
        }
      } else {
        setErro('Não foi possível redefinir a senha. Tente novamente.');
      }
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
          {sucesso ? (
            <>
              <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
                Senha redefinida
              </h1>
              <p className={styles.successMsg}>Sua senha foi atualizada com sucesso. Faça login com a nova senha.</p>
              <button className={styles.btnSubmit} onClick={() => navigate('/login')}>
                Ir para Login
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              <h1 className={styles.cardTitle} style={{ textAlign: 'left', fontSize: '1.4rem' }}>
                Redefinir senha
              </h1>
              <p className={styles.cardSubtitle}>Digite e confirme sua nova senha</p>

              <InputField
                label="NOVA SENHA"
                value={novaSenha}
                onChange={(v) => {
                  setNovaSenha(v);
                  setErro('');
                }}
                error={Boolean(erro)}
                placeholder="Mínimo 8 caracteres"
                show={showNova}
                onToggle={() => setShowNova((s) => !s)}
              />

              <InputField
                label="CONFIRMAR SENHA"
                value={confirma}
                onChange={(v) => {
                  setConfirma(v);
                  setErro('');
                }}
                error={Boolean(erro)}
                placeholder="Repita a senha"
                show={showConfirma}
                onToggle={() => setShowConfirma((s) => !s)}
              />

              <button type="submit" className={styles.btnSubmit} disabled={loading || !novaSenha || !confirma}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>

              {erro && <p className={styles.errorMsg}>{erro}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
