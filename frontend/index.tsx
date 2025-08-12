
// Ensure single React instance by importing consistently from 'react'
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Diagnostic: log React versions to detect duplicate copies
// eslint-disable-next-line no-console
console.log('[Diag] React version:', (React as any).version);

// In dev, aggressively unregister any existing service workers to avoid stale SW interference (HMR / hooks errors)
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => {
      // eslint-disable-next-line no-console
      console.log('[Diag] Unregistering SW during dev:', r.scope);
      r.unregister();
    });
  });
}
import './src/index.css';
import './styles/auth.css';
import { initializeBundleOptimizations } from './utils/bundleOptimization';

// Initialize bundle optimizations
initializeBundleOptimizations();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
