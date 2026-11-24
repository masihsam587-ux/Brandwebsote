import { AlertCircle, RefreshCw } from 'lucide-react';
import { normalizeAppError } from '../services/errorHandling';

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading products"
      className="grid grid-cols-2 gap-3 sm:gap-6"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass-panel overflow-hidden rounded-2xl p-2 sm:p-3"
        >
          <div className="ca-shimmer aspect-[4/3] w-full rounded-xl bg-[var(--ca-surface-subtle)]" />
          <div className="mt-3 space-y-2 px-1 pb-1 sm:mt-4 sm:space-y-2.5 sm:pb-1.5">
            <div className="ca-shimmer h-3 w-24 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer h-5 w-4/5 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="flex items-center justify-between pt-2">
              <div className="ca-shimmer h-4 w-20 rounded bg-[var(--ca-surface-subtle)]" />
              <div className="ca-shimmer h-9 w-16 rounded-[10px] bg-[var(--ca-surface-subtle)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading product details" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="ca-shimmer h-4 w-32 rounded bg-[var(--ca-surface-subtle)]" />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <div className="glass-panel rounded-3xl p-3">
            <div className="ca-shimmer aspect-[4/3] w-full rounded-2xl bg-[var(--ca-surface-subtle)]" />
          </div>
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="ca-shimmer h-20 w-24 rounded-2xl bg-[var(--ca-surface-subtle)]"
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="glass-panel space-y-4 rounded-3xl p-6 sm:p-7">
            <div className="ca-shimmer h-3 w-36 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer h-8 w-4/5 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer h-7 w-32 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="space-y-2 pt-2">
              <div className="ca-shimmer h-3.5 w-full rounded bg-[var(--ca-surface-subtle)]" />
              <div className="ca-shimmer h-3.5 w-5/6 rounded bg-[var(--ca-surface-subtle)]" />
            </div>
            <div className="ca-shimmer h-36 w-full rounded-2xl bg-[var(--ca-surface-subtle)]" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="ca-shimmer h-12 rounded-xl bg-[var(--ca-surface-subtle)]" />
              <div className="ca-shimmer h-12 rounded-xl bg-[var(--ca-surface-subtle)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading items" className="space-y-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="glass-panel rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="ca-shimmer h-4 w-36 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer h-4 w-24 rounded bg-[var(--ca-surface-subtle)]" />
          </div>
          <div className="ca-shimmer mt-4 h-3 w-2/3 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="ca-shimmer mt-2 h-3 w-1/2 rounded bg-[var(--ca-surface-subtle)]" />
        </div>
      ))}
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="ca-shimmer h-14 w-14 rounded-2xl bg-[var(--ca-surface-subtle)]" />
          <div className="space-y-2">
            <div className="ca-shimmer h-6 w-48 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer h-3 w-56 rounded bg-[var(--ca-surface-subtle)]" />
          </div>
        </div>
        <div className="ca-shimmer h-10 w-28 rounded-xl bg-[var(--ca-surface-subtle)]" />
      </div>
      <div className="ca-shimmer h-12 w-full max-w-md rounded-2xl bg-[var(--ca-surface-subtle)]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-panel h-72 rounded-3xl p-6 lg:col-span-2">
          <div className="ca-shimmer h-6 w-44 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ca-shimmer h-12 rounded-xl bg-[var(--ca-surface-subtle)]" />
            ))}
          </div>
        </div>
        <div className="glass-panel h-72 rounded-3xl p-6">
          <div className="ca-shimmer h-5 w-32 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="mt-4 space-y-3">
            <div className="ca-shimmer h-11 rounded-xl bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer h-11 rounded-xl bg-[var(--ca-surface-subtle)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading notifications and support threads" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, col) => (
        <div key={col} className="glass-panel space-y-4 rounded-3xl p-6">
          <div className="ca-shimmer h-6 w-44 rounded bg-[var(--ca-surface-subtle)]" />
          {Array.from({ length: 3 }).map((__, i) => (
            <div key={i} className="rounded-xl bg-[var(--ca-surface-subtle)] p-4">
              <div className="ca-shimmer h-4 w-1/2 rounded bg-[var(--ca-surface-solid)]" />
              <div className="ca-shimmer mt-2 h-3 w-full rounded bg-[var(--ca-surface-solid)]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SellerDashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading seller dashboard" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="glass-panel h-28 rounded-3xl p-5 md:col-span-2">
          <div className="ca-shimmer h-3 w-40 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="ca-shimmer mt-3 h-7 w-44 rounded bg-[var(--ca-surface-subtle)]" />
        </div>
        <div className="glass-panel h-28 rounded-3xl p-5">
          <div className="ca-shimmer h-3 w-32 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="ca-shimmer mt-3 h-7 w-28 rounded bg-[var(--ca-surface-subtle)]" />
        </div>
        <div className="glass-panel h-28 rounded-3xl p-5">
          <div className="ca-shimmer h-3 w-32 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="ca-shimmer mt-3 h-7 w-28 rounded bg-[var(--ca-surface-subtle)]" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel h-64 rounded-3xl p-6">
          <div className="ca-shimmer h-6 w-52 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="ca-shimmer mt-5 h-32 w-full rounded-2xl bg-[var(--ca-surface-subtle)]" />
        </div>
        <div className="glass-panel h-64 rounded-3xl p-6">
          <div className="ca-shimmer h-6 w-40 rounded bg-[var(--ca-surface-subtle)]" />
          <div className="ca-shimmer mt-5 h-32 w-full rounded-2xl bg-[var(--ca-surface-subtle)]" />
        </div>
      </div>
    </div>
  );
}

export function AdminWorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading admin workspace" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-[var(--ca-surface-solid)] p-4">
            <div className="ca-shimmer h-3 w-28 rounded bg-[var(--ca-surface-subtle)]" />
            <div className="ca-shimmer mt-2.5 h-6 w-36 rounded bg-[var(--ca-surface-subtle)]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="ca-shimmer h-48 rounded-2xl bg-[var(--ca-surface-subtle)]" />
        <div className="ca-shimmer h-48 rounded-2xl bg-[var(--ca-surface-subtle)]" />
      </div>
    </div>
  );
}


export function FriendlyErrorState({
  title,
  message,
  referenceId,
  error,
  onRetry,
}: {
  title?: string;
  message: string;
  referenceId?: string;
  error?: unknown;
  onRetry?: () => void;
}) {
  const normalized = error ? normalizeAppError(error, { fallbackMessage: message }) : null;
  const resolvedTitle = title || normalized?.title || 'Unable to load content';
  const resolvedMessage = message || normalized?.message || 'Please try again in a moment.';
  const resolvedRef = referenceId || normalized?.referenceId;

  return (
    <div role="alert" className="ca-fade-in glass-panel rounded-3xl p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/12 text-red-600 dark:text-red-400">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="font-display mt-3 text-2xl font-semibold text-[var(--ca-text)]">
        {resolvedTitle}
      </h3>
      <p className="mt-1.5 text-sm text-[var(--ca-text-muted)]">{resolvedMessage}</p>
      {resolvedRef && (
        <p className="font-mono-nums mt-3 inline-block rounded-lg bg-[var(--ca-surface-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--ca-text-muted)]">
          Ref: {resolvedRef}
        </p>
      )}
      {onRetry && (
        <div className="mt-5">
          <button
            type="button"
            onClick={onRetry}
            className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
