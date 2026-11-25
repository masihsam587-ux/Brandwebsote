import { useEffect, useState } from 'react';
import { api } from '../api';
import { getSupabase } from '../lib/supabaseClient.js';
import { SeoHead } from '../components/SeoHead';

type ProbeResult =
  | { status: 'loading'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export function StatusPage() {
  const hasSupabaseUrl = Boolean((import.meta.env.VITE_SUPABASE_URL || '').trim());
  const hasSupabaseAnonKey = Boolean((import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim());

  const [probe, setProbe] = useState<ProbeResult>({
    status: 'loading',
    message: 'Running test query...',
  });

  useEffect(() => {
    let cancelled = false;

    async function runProbe() {
      try {
        const sb = getSupabase();
        const { error } = await sb.from('products').select('id').limit(1);
        if (cancelled) return;
        if (error) {
          setProbe({
            status: 'error',
            message: error.message || 'Unknown Supabase error',
          });
        } else {
          setProbe({
            status: 'success',
            message: 'success',
          });
        }
      } catch (err) {
        if (cancelled) return;
        setProbe({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    runProbe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SeoHead
        title="Status — Cinematic Arts (CA)"
        description="Backend mode and Supabase connectivity diagnostics."
        canonicalPath="/status"
        noIndex
      />

      <section
        data-testid="status-page"
        className="ca-fade-in mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl">
            System Status
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ca-text-muted)]">
            Runtime backend diagnostics without personal or secret data.
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3">
              <dt className="font-medium text-[var(--ca-text-muted)]">Active backend mode</dt>
              <dd
                data-testid="status-backend-mode"
                className="font-mono-nums font-semibold text-[var(--ca-text)]"
              >
                {api.mode}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3">
              <dt className="font-medium text-[var(--ca-text-muted)]">
                VITE_SUPABASE_URL defined
              </dt>
              <dd
                data-testid="status-supabase-url"
                className="font-mono-nums font-semibold text-[var(--ca-text)]"
              >
                {String(hasSupabaseUrl)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3">
              <dt className="font-medium text-[var(--ca-text-muted)]">
                VITE_SUPABASE_ANON_KEY defined
              </dt>
              <dd
                data-testid="status-supabase-anon-key"
                className="font-mono-nums font-semibold text-[var(--ca-text)]"
              >
                {String(hasSupabaseAnonKey)}
              </dd>
            </div>

            <div className="rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-3">
              <dt className="font-medium text-[var(--ca-text-muted)]">
                Supabase test request (products, limit 1)
              </dt>
              <dd
                data-testid="status-supabase-test"
                className={`font-mono-nums mt-1.5 break-words text-xs font-semibold sm:text-sm ${
                  probe.status === 'success'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : probe.status === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-[var(--ca-text)]'
                }`}
              >
                {probe.message}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
