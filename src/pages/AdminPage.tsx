import { SeoHead } from '../components/SeoHead';
import { AdminConsole } from '../components/AdminConsole';

export function AdminPage() {
  return (
    <>
      <SeoHead
        title="Admin Portal — Cinematic Arts (CA)"
        description="Backend-verified administration console for Cinematic Arts (CA) orders, inventory, analytics, and installment plans."
        canonicalPath="/admin"
        noIndex
      />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl">
            Admin Portal
          </h1>
          <p className="mt-1 text-sm text-[var(--ca-text-muted)]">
            Protected by backend password verification and a 15-minute session token.
          </p>
        </div>

        <AdminConsole mode="page" />
      </section>
    </>
  );
}
