import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 50);
      }
    };
    tryScroll();
  }, [hash]);
  return null;
}

// Auth
import Login from './pages/auth/Login';
import ResetPassword from './pages/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Landing page components
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Escritorio from './components/Escritorio/Escritorio';
import Diferenciais from './components/Diferenciais/Diferenciais';
import Areas from './components/Areas/Areas';
import Sobre from './components/Sobre/Sobre';
import Artigos from './components/Artigos/Artigos';
import Contato from './components/Contato/Contato';
import Footer from './components/Footer/Footer';
import { OfficeConfigProvider } from './contexts/OfficeConfigContext';
import ArtigoPage from './pages/public/ArtigoPage';

// Sistema
import SistemaLayout from './layouts/SistemaLayout';
import Usuarios from './pages/sistema/Usuarios/Usuarios';
import LandingPageConfig from './pages/sistema/LandingPage/LandingPage';
import Notificacoes from './pages/sistema/Notificacoes/Notificacoes';
import Leads from './pages/sistema/Leads';
import Clientes from './pages/sistema/Clientes';
import Agenda from './pages/sistema/Agenda/Agenda';
import Pagamentos from './pages/sistema/Pagamentos/Pagamentos';
import Processos from './pages/sistema/Processos/Processos';
import Tarefas from './pages/sistema/Tarefas';
import Artigos_ from './pages/sistema/Artigos_/Artigos';
import LogsAPI from './pages/sistema/LogsAPI/LogsAPI';
import Feriados from './pages/sistema/Feriados/Feriados';

function LandingPage() {
  return (
    <OfficeConfigProvider>
      <Navbar />
      <main>
        <Hero />
        <Escritorio />
        <Diferenciais />
        <Areas />
        <Sobre />
        <Artigos />
        <Contato />
      </main>
      <Footer />
    </OfficeConfigProvider>
  );
}

function GoogleCalendarRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const gcal = params.get('google_calendar');
  if (gcal === 'connected' || gcal === 'error') {
    return <Navigate to={`/sistema/agenda?google_calendar=${gcal}`} replace />;
  }
  return null;
}

export default function App() {
  return (
    <>
    <BrowserRouter>
      <ScrollToHash />
      <Routes>
        {/* Landing page pública */}
        <Route path="/" element={<><GoogleCalendarRedirect /><LandingPage /></>} />
        <Route path="/artigos/:id" element={<ArtigoPage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Sistema */}
        <Route element={<ProtectedRoute />}>
          <Route path="/sistema" element={<SistemaLayout />}>
            <Route index element={<Navigate to="leads" replace />} />
            <Route element={<AdminRoute />}>
              <Route path="usuarios" element={<Usuarios />} />
            </Route>
            <Route path="landing-page" element={<LandingPageConfig />} />
            <Route path="artigos" element={<Artigos_ />} />
            <Route element={<AdminRoute />}>
              <Route path="leads" element={<Leads />} />
            </Route>
            <Route path="clientes" element={<Clientes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route element={<AdminRoute />}>
              <Route path="pagamentos" element={<Pagamentos />} />
            </Route>
            <Route path="processos" element={<Processos />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="notificacoes" element={<Notificacoes />} />
            <Route element={<AdminRoute />}>
              <Route path="logs-api" element={<LogsAPI />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="feriados" element={<Feriados />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  );
}
