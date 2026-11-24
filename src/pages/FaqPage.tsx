import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from '../services/seoService';
import { STORE_CONFIG } from '../services/siteConfig';

export function FaqPage() {
  const { t, locale, localize } = useLocale();
  const origin =
    typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl;
  const canonicalPath = localize('/faq');

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `اقساط اور آرڈرز سوالات — ${t.brand}`
            : 'Installment & COD FAQ — Cinematic Arts (CA)'
        }
        description={t.faq.intro}
        canonicalPath={canonicalPath}
        locale={locale}
        jsonLd={[
          buildFaqPageJsonLd(locale),
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.faq, path: canonicalPath },
            ],
            origin
          ),
        ]}
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.faq },
          ]}
        />

        <div className="glass-panel rounded-2xl p-6 sm:p-10">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl">
            {t.faq.heading}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base">
            {t.faq.intro}
          </p>

          <div className="mt-8 space-y-4">
            {t.faq.items.map((item) => (
              <article
                key={item.id}
                id={item.id}
                className="rounded-xl bg-[var(--ca-surface-subtle)] p-5 sm:p-6"
              >
                <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                  {item.question}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ca-text-muted)]">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                {t.faq.ctaTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--ca-text-muted)]">{t.faq.ctaDesc}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={localize('/contact')}
                className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
              >
                {t.faq.ctaButton}
              </Link>
              <Link
                to={localize('/shipping')}
                className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-solid)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)]"
              >
                {t.nav.shipping}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
