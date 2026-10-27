import { Navigate, Route, Routes } from 'react-router-dom';
import PublicPage from './pages/PublicPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/t/:slug/cardapio" element={<MenuPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
