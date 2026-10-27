import { Navigate, Route, Routes } from 'react-router-dom';
import PublicPage from './pages/PublicPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import OperationsWorkspace from './pages/OperationsWorkspace';
import ManagementPage from './pages/ManagementPage';
export default function App() {
  return <Routes>
    <Route path="/" element={<PublicPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/t/:slug/cardapio" element={<MenuPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/producao/*" element={<OperationsWorkspace />} />
    <Route path="/salao/*" element={<OperationsWorkspace />} />
    <Route path="/contas/*" element={<OperationsWorkspace />} />
    <Route path="/fila-espera" element={<OperationsWorkspace />} />
    <Route path="/gestao" element={<ManagementPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
