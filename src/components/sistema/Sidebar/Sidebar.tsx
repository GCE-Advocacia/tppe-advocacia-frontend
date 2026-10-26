import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  User,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { getSessionClaims } from '../../../services/api';
import { logout } from '../../../services/auth';
import { ABAS, canAccessAba } from '../../../config/abas';
import BrandLogo from '../../BrandLogo/BrandLogo';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const claims = getSessionClaims();
  const role = claims?.role === 'ADMIN' ? 'Administrador' : 'Usuário';
  const abasVisiveis = ABAS.filter(aba => canAccessAba(claims, aba));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(prev => !prev)}
        aria-label="Abrir menu"
      >
        <PanelLeftOpen size={22} />
      </button>

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>

        {/* Logo */}
        <div className={styles.logoArea}>
          <BrandLogo scope="system" className={styles.logo} />
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(prev => !prev)}
            aria-label="Recolher menu"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className={styles.nav}>
          {abasVisiveis.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/sistema/${path}`}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={20} strokeWidth={1.6} className={styles.icon} />
              <span className={styles.label}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className={styles.userArea}>
          <User size={20} strokeWidth={1.6} className={styles.userIcon} />
          <span className={styles.userName}>{role}</span>
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
            title="Sair do sistema"
            aria-label="Sair do sistema"
          >
            <LogOut size={18} />
          </button>
        </div>

      </aside>
    </>
  );
}
