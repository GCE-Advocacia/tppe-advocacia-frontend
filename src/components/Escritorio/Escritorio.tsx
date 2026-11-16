import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useOfficeConfig } from '../../contexts/OfficeConfigContext';
import styles from './Escritorio.module.css';

export default function Escritorio() {
  const imgRef  = useScrollReveal<HTMLDivElement>();
  const textRef = useScrollReveal<HTMLDivElement>();
  const { config } = useOfficeConfig();

  const title       = config?.about_title       ?? 'Excelência jurídica com foco em resultados';
  const description = config?.about_description ?? 'O escritório nasceu com o propósito de oferecer soluções jurídicas personalizadas e estratégicas para empresas que buscam crescimento sustentável.';
  const imgUrl      = config?.about_image_url   ?? '/placeholder.png';
  const imgPos      = config?.about_image_position ? config.about_image_position.split(',').map(v => `${v.trim()}%`).join(' ') : '50% 50%';
  const websiteUrl  = config?.website_url       ?? '#';

  return (
    <section id="escritorio" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div ref={imgRef} className={styles.imgBox}>
            <img src={imgUrl} alt="" className={styles.placeholder} style={{ objectPosition: imgPos }} />
          </div>

          <div ref={textRef} className={styles.text}>
            <p className={styles.tag}>O Escritório</p>
            <div className={styles.divider} />
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.body}>{description}</p>
            <a href={websiteUrl} className={styles.linkSaiba} target="_blank" rel="noopener noreferrer">Saiba Mais →</a>
          </div>
        </div>
      </div>
    </section>
  );
}
