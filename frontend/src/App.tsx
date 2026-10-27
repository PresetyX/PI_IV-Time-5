import { Navigate, Route, Routes } from 'react-router-dom';
import PublicPage from './pages/PublicPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import StoreCoverPage from './pages/client/StoreCoverPage';
import TableScanPage from './pages/client/TableScanPage';
import ServiceModePage from './pages/client/ServiceModePage';
import ClientPlaceholderPage from './pages/client/ClientPlaceholderPage';
import IdentificationPage from './pages/client/IdentificationPage';
import TableNumberPage from './pages/client/TableNumberPage';
import LoginPage from './pages/LoginPage';
import OperationsWorkspace from './pages/OperationsWorkspace';
import ManagementPage from './pages/ManagementPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/t/:slug" element={<StoreCoverPage />} />
      <Route path="/t/:slug/cardapio" element={<MenuPage />} />
      <Route path="/t/:slug/entrada" element={<ServiceModePage />} />
      <Route path="/t/:slug/identificacao" element={<IdentificationPage />} />
      <Route path="/t/:slug/mesa" element={<TableNumberPage />} />
      <Route
        path="/t/:slug/comandas"
        element={
          <ClientPlaceholderPage
            title="Comandas da mesa"
            description="Você já está identificado. As comandas da mesa entram na próxima parte do projeto."
          />
        }
      />
      <Route
        path="/t/:slug/balcao"
        element={
          <ClientPlaceholderPage
            title="Retirar no balcão"
            description="O pedido para retirada com senha entra na próxima parte do projeto."
          />
        }
      />
      <Route
        path="/t/:slug/entrega"
        element={
          <ClientPlaceholderPage
            title="Receber em casa"
            description="O pedido para entrega entra numa próxima parte do projeto."
          />
        }
      />
      <Route path="/t/:slug/:tableToken" element={<TableScanPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/producao/*" element={<OperationsWorkspace />} />
      <Route path="/salao/*" element={<OperationsWorkspace />} />
      <Route path="/contas/*" element={<OperationsWorkspace />} />
      <Route path="/fila-espera" element={<OperationsWorkspace />} />
      <Route path="/gestao" element={<ManagementPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
