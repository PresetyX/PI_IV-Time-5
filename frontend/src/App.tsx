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
import TabsPage from './pages/client/TabsPage';
import JoinTabPage from './pages/client/JoinTabPage';
import MyTabPage from './pages/client/MyTabPage';
import BillPage from './pages/client/BillPage';
import LoginPage from './pages/LoginPage';
import OperationsWorkspace from './pages/OperationsWorkspace';
import ManagementPage from './pages/ManagementPage';
import AbcPage from './pages/management/AbcPage';
import TeamPage from './pages/management/TeamPage';

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
      <Route path="/t/:slug/comandas" element={<TabsPage />} />
      <Route path="/t/:slug/comandas/minha" element={<MyTabPage />} />
      <Route path="/t/:slug/comandas/:tabId/entrar" element={<JoinTabPage />} />
      <Route path="/t/:slug/conta" element={<BillPage />} />
      <Route
        path="/t/:slug/pix"
        element={
          <ClientPlaceholderPage
            title="Pagar por Pix"
            description="O pagamento por Pix entra na próxima parte do projeto."
          />
        }
      />
      <Route
        path="/t/:slug/garcom"
        element={
          <ClientPlaceholderPage
            title="Chamar o garçom"
            description="O chamado de garçom entra na próxima parte do projeto."
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
      <Route path="/gestao/curva-abc" element={<AbcPage />} />
      <Route path="/gestao/equipe" element={<TeamPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
