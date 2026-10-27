import {
  UserCog,
  Layout,
  FileText,
  UserPlus,
  UsersRound,
  CalendarDays,
  Wallet,
  Briefcase,
  LayoutList,
  Bell,
  Activity,
  CalendarX2,
  type LucideIcon,
} from 'lucide-react';
import { hasPermission, type PermissionKey, type SessionClaims } from '../services/api';

export type Aba = {
  /** Permissão exigida; `null` = exclusiva do ADMIN (Usuários). */
  key: PermissionKey | null;
  label: string;
  /** Segmento da rota dentro de /sistema. */
  path: string;
  icon: LucideIcon;
};

/** Abas do /sistema na ordem do menu. Fonte única para rotas, menu e redirecionamento. */
export const ABAS = [
  { key: null,           label: 'Usuários',     path: 'usuarios',     icon: UserCog },
  { key: 'landing_page', label: 'Landing Page', path: 'landing-page', icon: Layout },
  { key: 'artigos',      label: 'Artigos',      path: 'artigos',      icon: FileText },
  { key: 'leads',        label: 'Leads',        path: 'leads',        icon: UserPlus },
  { key: 'clientes',     label: 'Clientes',     path: 'clientes',     icon: UsersRound },
  { key: 'agenda',       label: 'Agenda',       path: 'agenda',       icon: CalendarDays },
  { key: 'pagamentos',   label: 'Pagamentos',   path: 'pagamentos',   icon: Wallet },
  { key: 'processos',    label: 'Processos',    path: 'processos',    icon: Briefcase },
  { key: 'tarefas',      label: 'Tarefas',      path: 'tarefas',      icon: LayoutList },
  { key: 'notificacoes', label: 'Notificações', path: 'notificacoes', icon: Bell },
  { key: 'logs_api',     label: 'Logs DataJud', path: 'logs-api',     icon: Activity },
  { key: 'feriados',     label: 'Feriados',     path: 'feriados',     icon: CalendarX2 },
  { key: 'financeiro',   label: 'Financeiro',   path: 'financeiro',   icon: Wallet },
] as const satisfies readonly Aba[];

export type AbaPath = (typeof ABAS)[number]['path'];

export const SEM_ACESSO_PATH = 'sem-acesso';

const ADMIN_DEFAULT_PATH: AbaPath = 'leads';

export function canAccessAba(claims: SessionClaims | null, aba: Aba): boolean {
  if (aba.key === null) return claims?.role === 'ADMIN';
  return hasPermission(claims, aba.key);
}

/** Rota inicial de /sistema: ADMIN vai para Leads; funcionário, para a primeira aba liberada. */
export function defaultSistemaPath(claims: SessionClaims | null): string {
  if (claims?.role === 'ADMIN') return ADMIN_DEFAULT_PATH;
  return ABAS.find(aba => canAccessAba(claims, aba))?.path ?? SEM_ACESSO_PATH;
}
