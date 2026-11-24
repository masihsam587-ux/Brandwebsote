import { hydrate } from '@tanstack/react-query';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { queryClient } from './api/queryClient';
import { normalizeAppError, reportGlobalError } from './services/errorHandling';
import { captureAppException, initSentry } from './services/sentry';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  initSentry();

  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeAppError(event.reason);
    if (
      normalized.kind === 'offline' ||
      normalized.kind === 'timeout' ||
      normalized.kind === 'server'
    ) {
      captureAppException(event.reason, {
        referenceId: normalized.referenceId,
        kind: normalized.kind,
        status: normalized.status,
        source: 'unhandledrejection',
      });
      reportGlobalError(event.reason, () => {
        void queryClient.refetchQueries({ type: 'active' });
      });
    }
  });

  window.addEventListener('error', (event) => {
    if (event.error) {
      const normalized = normalizeAppError(event.error);
      captureAppException(event.error, {
        referenceId: normalized.referenceId,
        kind: normalized.kind,
        status: normalized.status,
        source: 'window.error',
      });
    }
  });
}

if (typeof document !== 'undefined') {
  const stateEl = document.getElementById('ca-ssr-state');
  const rawState = stateEl?.textContent?.trim();
  if (rawState && rawState !== '<!--app-state-->') {
    try {
      hydrate(queryClient, JSON.parse(rawState));
    } catch {
      // Ignore malformed SSR hydration payloads cleanly
    }
  }
}

const rootEl = document.getElementById('root')!;
const hasServerMarkup =
  rootEl.children.length > 0 && !rootEl.innerHTML.includes('<!--app-html-->');

if (hasServerMarkup) {
  hydrateRoot(rootEl, <App />);
} else {
  createRoot(rootEl).render(<App />);
}
