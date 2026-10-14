import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ProvedorDeTema from './theme/ProvedorDeTema';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProvedorDeTema>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProvedorDeTema>
  </React.StrictMode>,
);
