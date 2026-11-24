import type { ButtonHTMLAttributes, PointerEvent, ReactNode } from 'react';
import { Check } from 'lucide-react';

interface CALoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 'h-4 w-4', text: 'text-[7px]', stroke: 2.5 },
  md: { box: 'h-8 w-8', text: 'text-[10px]', stroke: 2 },
  lg: { box: 'h-14 w-14', text: 'text-base', stroke: 1.75 },
};

export function CALoader({ size = 'md', label, className = '' }: CALoaderProps) {
  const cfg = SIZE_MAP[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <span className={`relative inline-flex items-center justify-center ${cfg.box}`}>
        <svg
          viewBox="0 0 40 40"
          aria-hidden="true"
          className="ca-loader-spin absolute inset-0 h-full w-full"
        >
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth={cfg.stroke}
          />
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke="var(--ca-accent)"
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray="68 38"
          />
        </svg>
        <span
          className={`ca-loader-pulse font-display font-semibold tracking-wider leading-none ${cfg.text}`}
        >
          CA
        </span>
      </span>
      {label ? (
        <span className="text-xs font-medium text-[var(--ca-text-muted)]">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}

export function CALoadingOverlay({
  open,
  label = 'Processing request...',
}: {
  open: boolean;
  label?: string;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="ca-fade-in fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4"
    >
      <div className="glass-panel flex min-w-[200px] flex-col items-center rounded-2xl px-8 py-6 text-center shadow-lg">
        <CALoader size="lg" label={label} />
      </div>
    </div>
  );
}

export function triggerTapRipple(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dot = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 0.65;
  dot.className = 'ca-ripple-dot';
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.left = `${e.clientX ? e.clientX - rect.left : rect.width / 2}px`;
  dot.style.top = `${e.clientY ? e.clientY - rect.top : rect.height / 2}px`;
  el.appendChild(dot);
  window.setTimeout(() => dot.remove(), 550);
}

interface CAProcessButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  status?: 'idle' | 'success' | 'error';
  children: ReactNode;
}

export function CAProcessButton({
  loading = false,
  status = 'idle',
  disabled,
  className = '',
  children,
  onPointerDown,
  ...rest
}: CAProcessButtonProps) {
  const isError = status === 'error';
  const isSuccess = status === 'success';

  return (
    <button
      {...rest}
      disabled={loading || disabled}
      onPointerDown={(e) => {
        if (!loading && !disabled) triggerTapRipple(e);
        onPointerDown?.(e);
      }}
      className={`btn-press relative inline-flex min-h-[44px] items-center justify-center overflow-hidden transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
        isError ? 'ca-shake ring-2 ring-red-500/80' : ''
      } ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center gap-2 transition-opacity duration-150 ${
          loading || isSuccess ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </span>

      {loading && (
        <span className="ca-fade-in absolute inset-0 flex items-center justify-center">
          <CALoader size="sm" />
        </span>
      )}

      {!loading && isSuccess && (
        <span className="ca-badge-pop absolute inset-0 flex items-center justify-center gap-1.5 text-emerald-500">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
