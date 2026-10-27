import { Navigate, Route, Routes } from 'react-router-dom';
import PublicPage from './pages/PublicPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import StoreCoverPage from './pages/client/StoreCoverPage';
import TableScanPage from './pages/client/TableScanPage';
import LoginPage from './pages/LoginPage';
import ProductionPage from './pages/ProductionPage';
import FloorPage from './pages/FloorPage';
import ManagementPage from './pages/ManagementPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/t/:slug" element={<StoreCoverPage />} />
      <Route path="/t/:slug/cardapio" element={<MenuPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/producao" element={<ProductionPage />} />
      <Route path="/salao" element={<FloorPage />} />
      <Route path="/gestao" element={<ManagementPage />} />
      <Route path="/t/:slug/:tableToken" element={<TableScanPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
