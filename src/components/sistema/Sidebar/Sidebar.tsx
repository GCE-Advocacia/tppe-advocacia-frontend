import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  User,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { getSessionClaims } from '../../../services/api';
import { getEmailHealth } from '../../../services/emailLogs';
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
  const isAdmin = claims?.role === 'ADMIN';
  // Alertas do envio de e-mail aparecem no menu mesmo com o SMTP fora.
  const [emailAlerts, setEmailAlerts] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const load = () => {
      getEmailHealth()
        .then(h => { if (active) setEmailAlerts(h.alerts.length); })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 120000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAdmin]);

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
          <BrandLogo scope="system" background="auto" className={styles.logo} />
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
              <span className={styles.iconWrap}>
                <Icon size={20} strokeWidth={1.6} className={styles.icon} />
                {path === 'emails' && emailAlerts > 0 && (
                  <span className={styles.alertDot} aria-hidden="true" />
                )}
              </span>
              <span className={styles.label}>
                {label}
                {path === 'emails' && emailAlerts > 0 && (
                  <span className={styles.alertBadge}>
                    {emailAlerts}
                    <span className={styles.srOnly}> alerta(s) de envio</span>
                  </span>
                )}
              </span>
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
