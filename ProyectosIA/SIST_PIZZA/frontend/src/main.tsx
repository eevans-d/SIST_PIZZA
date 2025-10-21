/**
 * Punto de entrada (main.tsx)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('Service Worker registration failed:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
