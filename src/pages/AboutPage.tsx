import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildBreadcrumbJsonLd, buildOrganizationJsonLd } from '../services/seoService';
import { getRuntimeOrigin } from '../services/siteConfig';

export function AboutPage() {
  const { t, locale, isRtl, localize } = useLocale();
  const origin = getRuntimeOrigin();
  const canonicalPath = localize('/about');
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `ہمارے بارے میں — ${t.brand}`
            : 'About Cinematic Arts (CA) — Peshawar Clothing Store'
        }
        description={t.about.lead}
        canonicalPath={canonicalPath}
        locale={locale}
        jsonLd={[
          buildOrganizationJsonLd(origin),
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.about, path: canonicalPath },
            ],
            origin
          ),
        ]}
      />

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.about },
          ]}
        />

        <div className="glass-panel rounded-2xl p-6 sm:p-10">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl">
            {t.about.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ca-text-muted)]">
            {t.about.lead}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {t.about.sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-xl bg-[var(--ca-surface-subtle)] p-5"
              >
                <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                  {section.heading}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--ca-text-muted)]">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={localize('/shop')}
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90"
            >
              {t.about.ctaShop}
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              to={localize('/contact')}
              className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-3 text-sm font-medium text-[var(--ca-text)] hover:opacity-85"
            >
              {t.about.ctaContact}
            </Link>
            <Link
              to={localize('/faq')}
              className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-3 text-sm font-medium text-[var(--ca-text)] hover:opacity-85"
            >
              {t.nav.faq}
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
