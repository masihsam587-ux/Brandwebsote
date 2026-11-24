import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { UserRole } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { ProfilePageSkeleton } from './Skeletons';

interface RouteGuardProps {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

/**
 * UX Route Guard: blocks rendering protected/role-gated UI until session state resolves.
 * Note: All authorization MUST also be enforced server-side / via RLS policies.
 */
export function RouteGuard({
  requireAuth = true,
  requiredRole,
  children,
  fallbackTitle = 'Sign In Required',
  fallbackDescription = 'Please sign in with an authorized account to access this view.',
}: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (requireAuth && !user) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
            {fallbackTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--ca-text-muted)]">{fallbackDescription}</p>
          <Link
            to="/auth?redirect=/profile"
            className="btn-press mt-6 inline-flex rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)]"
          >
            Sign In / Register
          </Link>
        </div>
      </section>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
            Seller Access Only
          </h1>
          <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
            This dashboard is reserved for verified CA Seller accounts.
          </p>
          <Link
            to="/shop"
            className="btn-press mt-6 inline-flex rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)]"
          >
            Browse Catalog
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
