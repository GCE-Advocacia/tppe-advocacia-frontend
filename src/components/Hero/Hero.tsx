import { useOfficeConfig } from '../../contexts/OfficeConfigContext';
import styles from './Hero.module.css';

export default function Hero() {
  const { config } = useOfficeConfig();

  const title    = config?.hero_title    ?? 'Soluções jurídicas para empresas que querem crescer com segurança';
  const subtitle = config?.hero_subtitle ?? 'Assessoria jurídica especializada com foco em resultados práticos e estratégias personalizadas para o seu negócio.';
  const imgUrl   = config?.hero_image_url ?? '/placeholder.png';
  const imgPos   = config?.hero_image_position ? config.hero_image_position.split(',').map(v => `${v.trim()}%`).join(' ') : '50% 50%';

  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.left}>
          <div className={styles.textGroup}>
            <p className={styles.tag}>Advocacia Empresarial</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            <div className={styles.actions}>
              <a href="#contato"    className={styles.btnPrimary}>Fale Conosco</a>
              <a href="#escritorio" className={styles.btnOutline}>Conheça o Escritório</a>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.visual} aria-hidden="true">
          <img src={imgUrl} alt="" className={styles.placeholder} style={{ objectPosition: imgPos }} />
        </div>
      </div>
    </section>
  );
}
