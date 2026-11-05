import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import OrderReadyNotifier from './components/client/OrderReadyNotifier';
import AppThemeProvider from './theme/AppThemeProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <BrowserRouter>
        <App />
        <OrderReadyNotifier />
      </BrowserRouter>
    </AppThemeProvider>
  </React.StrictMode>,
);
