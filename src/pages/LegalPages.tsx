import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { productService } from '../api';
import { DEFAULT_TERMS_POLICY } from '../api/seedData';
import type { TermsPolicyDocument } from '../api/types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildBreadcrumbJsonLd } from '../services/seoService';
import { getRuntimeOrigin } from '../services/siteConfig';

export function TermsPage() {
  const { t, locale, localize } = useLocale();
  const [doc, setDoc] = useState<TermsPolicyDocument>(DEFAULT_TERMS_POLICY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const live = await productService.getTermsPolicy();
      setDoc(live);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Terms & Policy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  const origin = getRuntimeOrigin();

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `شرائط و اقساط پالیسی — ${t.brand}`
            : 'Terms & Installment Policy — Cinematic Arts (CA)'
        }
        description="Read Cinematic Arts terms of service, 7-day exchanges, PKR installment financing rules, and 10% seller referral commission."
        canonicalPath={localize('/terms')}
        locale={locale}
        jsonLd={[
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.terms, path: localize('/terms') },
            ],
            origin
          ),
        ]}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.terms },
          ]}
        />
        <div className="glass-panel rounded-2xl p-7 sm:p-10 space-y-6">
          <header className="pb-2">
            <p className="text-xs text-[var(--ca-text-muted)]">
              {doc.effectiveLabel}
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold text-[var(--ca-text)]">
              {locale === 'ur' ? t.nav.terms : doc.title}
            </h1>
          </header>

          {loading ? (
            <div className="space-y-4">
              <div className="h-6 w-1/2 animate-pulse rounded-lg bg-[var(--ca-surface-subtle)]" />
              <div className="h-20 w-full animate-pulse rounded-xl bg-[var(--ca-surface-subtle)]" />
              <div className="h-20 w-full animate-pulse rounded-xl bg-[var(--ca-surface-subtle)]" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadTerms}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-current px-3.5 py-1.5 text-xs font-semibold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <>
              {doc.sections.map((section) => (
                <section
                  key={section.id}
                  className="space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]"
                >
                  <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                    {section.heading}
                  </h2>
                  <p className="whitespace-pre-line">{section.body}</p>
                </section>
              ))}

              <footer className="pt-4 text-xs text-[var(--ca-text-muted)] flex flex-wrap items-center justify-between gap-2">
                <span>
                  {doc.footerNote ||
                    'Questions? Email cinematicartsofficial.io@gmail.com or call 03355329722.'}
                </span>
                <span className="font-mono-nums">
                  Updated {doc.updatedAt.slice(0, 10)}
                </span>
              </footer>
            </>
          )}
        </div>
      </article>
    </>
  );
}

export function PrivacyPage() {
  const { t, locale, localize } = useLocale();
  const origin = getRuntimeOrigin();

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `پرائیویسی پالیسی — ${t.brand}`
            : 'Privacy Policy & Data Usage — Cinematic Arts (CA)'
        }
        description="How Cinematic Arts handles customer delivery details, seller verification records, and account deletion rights."
        canonicalPath={localize('/privacy')}
        locale={locale}
        jsonLd={[
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.privacy, path: localize('/privacy') },
            ],
            origin
          ),
        ]}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.privacy },
          ]}
        />
        <div className="glass-panel rounded-2xl p-7 sm:p-10 space-y-6">
          <header className="pb-2">
            <p className="text-xs text-[var(--ca-text-muted)]">
              {t.brandFull} · {t.locationShort}
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold text-[var(--ca-text)]">
              {t.nav.privacy}
            </h1>
          </header>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]">
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              1. Information We Collect
            </h2>
            <p>
              We collect only the contact and delivery fields required to fulfill your order: full
              name, mobile number, WhatsApp contact, street address, city, and postal code. Seller
              applicants additionally provide father&apos;s name and profile identification for
              installment referral verification.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]">
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              2. How Your Data Is Used
            </h2>
            <p>
              Your contact details are used exclusively for order dispatch, WhatsApp delivery
              coordination, installment recovery tracking, and customer support replies. We never sell
              or rent customer records to third-party advertisers.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-[var(--ca-text-muted)]">
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              3. Account Deletion &amp; Security
            </h2>
            <p>
              Customers may edit their personal delivery details or permanently delete their account
              at any time from the Profile screen. Passwords and administrative credentials are
              verified exclusively on the server using salted cryptographic hashing.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
