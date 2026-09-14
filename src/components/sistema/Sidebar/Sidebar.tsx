import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  UserCog,
  Layout,
  FileText,
  UserPlus,
  UsersRound,
  CalendarDays,
  Briefcase,
  LayoutList,
  Bell,
  Activity,
  CalendarX2,
  Wallet,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { getSessionClaims } from '../../../services/api';
import { logout } from '../../../services/auth';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Usuários',      href: '/sistema/usuarios',      icon: UserCog,      adminOnly: true  },
  { label: 'Landing Page',  href: '/sistema/landing-page',  icon: Layout,       adminOnly: false },
  { label: 'Artigos',       href: '/sistema/artigos',        icon: FileText,     adminOnly: false },
  { label: 'Leads',         href: '/sistema/leads',          icon: UserPlus,     adminOnly: false },
  { label: 'Clientes',      href: '/sistema/clientes',       icon: UsersRound,   adminOnly: false },
  { label: 'Agenda',        href: '/sistema/agenda',         icon: CalendarDays, adminOnly: false },
  { label: 'Processos',     href: '/sistema/processos',      icon: Briefcase,    adminOnly: false },
  { label: 'Tarefas',       href: '/sistema/tarefas',        icon: LayoutList,   adminOnly: false },
  { label: 'Notificações',  href: '/sistema/notificacoes',   icon: Bell,         adminOnly: false },
  { label: 'Logs DataJud',  href: '/sistema/logs-api',       icon: Activity,     adminOnly: true  },
  { label: 'Feriados',      href: '/sistema/feriados',        icon: CalendarX2,   adminOnly: true  },
  { label: 'Financeiro',    href: '/sistema/financeiro',      icon: Wallet,       adminOnly: true  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const claims = getSessionClaims();
  const role = claims?.role === 'ADMIN' ? 'Administrador' : 'Usuário';
  const isAdmin = claims?.role === 'ADMIN';

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
          <img src="/logo.png" alt="Vitor França" className={styles.logo} />
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
          {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(({ label, href, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
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
