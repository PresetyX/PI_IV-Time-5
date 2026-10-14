import { Navigate, Route, Routes } from 'react-router-dom';
import PaginaPublica from './pages/PaginaPublica';
import PaginaPainel from './pages/PaginaPainel';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PaginaPublica />} />
      <Route path="/painel" element={<PaginaPainel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
