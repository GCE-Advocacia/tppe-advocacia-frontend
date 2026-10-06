import { Navigate, Outlet } from 'react-router-dom';
import { canViewPayments, getSessionClaims } from '../../services/api';

export default function PaymentsViewRoute() {
  if (!canViewPayments(getSessionClaims())) {
    return <Navigate to="/sistema" replace />;
  }
  return <Outlet />;
}
