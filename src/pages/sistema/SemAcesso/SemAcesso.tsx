import { Lock } from 'lucide-react';
import styles from './SemAcesso.module.css';

export default function SemAcesso() {
  return (
    <section className={styles.page} data-testid="sem-acesso">
      <Lock size={36} strokeWidth={1.6} className={styles.icon} />
      <h1>Sem acesso</h1>
      <p>Você ainda não tem acesso a nenhuma área. Fale com o administrador.</p>
    </section>
  );
}
