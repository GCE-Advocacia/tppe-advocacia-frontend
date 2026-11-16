import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useOfficeConfig } from '../../contexts/OfficeConfigContext';
import styles from './Sobre.module.css';

export default function Sobre() {
  const imgRef  = useScrollReveal<HTMLDivElement>();
  const textRef = useScrollReveal<HTMLDivElement>();
  const { config } = useOfficeConfig();

  const name        = config?.lawyer_name        ?? 'Vitor França';
  const oab         = config?.lawyer_oab         ?? 'OAB/SP 123.456';
  const description = config?.lawyer_description ?? 'Advogado especializado em Direito Empresarial, com mais de 15 anos de experiência em assessoria jurídica estratégica para empresas de médio e grande porte.';
  const imgUrl      = config?.lawyer_image_url   ?? 'vitor.png';
  const imgPos      = config?.lawyer_image_position ? config.lawyer_image_position.split(',').map(v => `${v.trim()}%`).join(' ') : '50% 50%';
  const linkedinUrl = config?.linkedin_url       ?? '#';

  return (
    <section id="sobre" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>

          <div className={styles.imgGroup}>
            <div ref={imgRef} className={styles.imgBox}>
              <img src={imgUrl} alt="" className={styles.placeholder} style={{ objectPosition: imgPos }} />
            </div>
            <div className={styles.divider} />
          </div>

          <div ref={textRef} className={styles.text}>
            <h2 className={styles.name}>{name}</h2>
            <p className={styles.oab}>{oab}</p>
            <p className={styles.body}>{description}</p>
            <a href={linkedinUrl} className={styles.linkSaiba} target="_blank" rel="noopener noreferrer">Ver currículo completo →</a>
          </div>

        </div>
      </div>
    </section>
  );
}
