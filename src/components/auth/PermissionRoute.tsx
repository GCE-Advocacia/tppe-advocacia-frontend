import { Navigate, Outlet } from 'react-router-dom';
import { getSessionClaims, hasPermission, type PermissionKey } from '../../services/api';

export default function PermissionRoute({ permission }: { permission: PermissionKey }) {
  const claims = getSessionClaims();
  if (!claims) return <Navigate to="/login" replace />;
  if (!hasPermission(claims, permission)) {
    return <Navigate to="/sistema" replace />;
  }
  return <Outlet />;
}
