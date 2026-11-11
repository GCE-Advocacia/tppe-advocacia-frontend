import { Navigate, Outlet } from 'react-router-dom';
import { getSessionClaims } from '../../services/api';

export default function AdminRoute() {
  const claims = getSessionClaims();
  if (!claims) return <Navigate to="/login" replace />;
  if (claims.role !== 'ADMIN') {
    return <Navigate to="/sistema/clientes" replace />;
  }
  return <Outlet />;
}
