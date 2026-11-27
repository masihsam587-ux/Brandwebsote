import { CheckCircle2, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildBreadcrumbJsonLd } from '../services/seoService';
import { getRuntimeOrigin } from '../services/siteConfig';

export function ShippingPage() {
  const { t, locale, localize } = useLocale();
  const origin = getRuntimeOrigin();
  const canonicalPath = localize('/shipping');

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `ڈیلیوری اور واپسی — ${t.brand}`
            : 'Shipping, COD & 7-Day Returns — Cinematic Arts'
        }
        description={t.shipping.intro}
        canonicalPath={canonicalPath}
        locale={locale}
        jsonLd={[
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.shipping, path: canonicalPath },
            ],
            origin
          ),
        ]}
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.shipping },
          ]}
        />

        <div className="glass-panel space-y-8 rounded-2xl p-6 sm:p-10">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl">
              {t.shipping.heading}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base">
              {t.shipping.intro}
            </p>
          </div>

          <section>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[var(--ca-accent)]" />
              <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                {t.shipping.zonesTitle}
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {t.shipping.zones.map((zone) => (
                <div
                  key={zone.region}
                  className="rounded-xl bg-[var(--ca-surface-subtle)] p-5"
                >
                  <p className="text-sm font-semibold text-[var(--ca-text)]">{zone.region}</p>
                  <p className="font-mono-nums mt-2 text-base font-bold text-[var(--ca-accent)]">
                    {zone.eta}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--ca-text-muted)]">{zone.payment}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              {t.shipping.returnsTitle}
            </h2>
            <ul className="mt-4 space-y-3">
              {t.shipping.returnsPoints.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl bg-[var(--ca-surface-subtle)] p-4 text-sm leading-relaxed text-[var(--ca-text-muted)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              to={localize('/size-guide')}
              className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]"
            >
              {t.nav.sizeGuide}
            </Link>
            <Link
              to={localize('/faq')}
              className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)]"
            >
              {t.nav.faq}
            </Link>
            <Link
              to={localize('/shop')}
              className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
            >
              {t.hero.shopCollection}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
