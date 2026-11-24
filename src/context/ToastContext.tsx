import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (title: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, kind: ToastKind = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, kind }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  // Subtle non-blocking welcome greeting on first visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return;
    try {
      if (!sessionStorage.getItem('ca_welcomed')) {
        sessionStorage.setItem('ca_welcomed', '1');
        const timer = window.setTimeout(() => {
          showToast('Welcome to Cinematic Arts (CA) — Clothing & Accessories across Pakistan', 'info');
        }, 1200);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-16 z-50 flex max-w-sm flex-col gap-2 sm:right-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="ca-toast-in glass-panel pointer-events-auto flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-[var(--ca-text)]"
          >
            {t.kind === 'success' && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {t.kind === 'error' && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            {t.kind === 'info' && (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" />
            )}
            <span className="flex-1 leading-snug">{t.title}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded-lg p-0.5 text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
