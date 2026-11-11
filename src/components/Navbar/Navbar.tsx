import { useState } from 'react';
import BrandLogo from '../BrandLogo/BrandLogo';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { label: 'Escritório',   href: '#escritorio'  },
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Áreas',        href: '#areas'        },
  { label: 'Sobre',        href: '#sobre'        },
  { label: 'Artigos',      href: '#artigos'      },
  { label: 'Contato',      href: '#contato'      },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <a href="#" className={styles.logo}>
          <BrandLogo background="auto" className={styles.logoImg} />
        </a>

        <ul className={styles.links}>
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <a href={href} className={styles.link}>{label}</a>
            </li>
          ))}
        </ul>

        <a href="#contato" className={styles.btnAgendar}>Agendar Consulta</a>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Abrir menu"
        >
          <span /><span /><span />
        </button>
      </div>

      <div className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}>
        <ul className={styles.drawerLinks}>
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <a href={href} className={styles.drawerLink} onClick={closeMenu}>{label}</a>
            </li>
          ))}
          <li>
            <a href="#contato" className={styles.drawerBtn} onClick={closeMenu}>Agendar Consulta</a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
