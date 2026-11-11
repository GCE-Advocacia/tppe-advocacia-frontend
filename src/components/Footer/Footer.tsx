import { useOfficeConfig } from '../../contexts/OfficeConfigContext';
import BrandLogo from '../BrandLogo/BrandLogo';
import styles from './Footer.module.css';

const LINKS = [
  { label: 'Escritório',   href: '#escritorio'  },
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Áreas',        href: '#areas'        },
  { label: 'Sobre',        href: '#sobre'        },
  { label: 'Artigos',      href: '#artigos'      },
  { label: 'Contato',      href: '#contato'      },
];

export default function Footer() {
  const { config } = useOfficeConfig();

  const linkedinUrl  = config?.linkedin_url  ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const whatsappUrl  = config?.whatsapp_url  ?? '#';
  const websiteUrl   = config?.website_url   ?? '#';
  const oab          = config?.lawyer_oab    ?? 'OAB/SP 123.456';

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <a href="#" className={styles.logo}>
          <BrandLogo background="auto" className={styles.logoImg} />
        </a>

        <ul className={styles.links}>
          {LINKS.map(({ label, href }) => (
            <li key={href}>
              <a href={href} className={styles.link}>{label}</a>
            </li>
          ))}
        </ul>

        <div className={styles.social}>
          <a href={linkedinUrl}  className={styles.link} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={instagramUrl} className={styles.link} target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>{oab}</span>
        <span>© 2026 Vitor França. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}
