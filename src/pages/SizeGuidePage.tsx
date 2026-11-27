import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildBreadcrumbJsonLd } from '../services/seoService';
import { getRuntimeOrigin } from '../services/siteConfig';

export function SizeGuidePage() {
  const { t, locale, localize } = useLocale();
  const origin = getRuntimeOrigin();
  const canonicalPath = localize('/size-guide');

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? `سائز گائیڈ — ${t.brand}`
            : 'Clothing Size Guide — Cinematic Arts (CA)'
        }
        description={t.sizeGuide.intro}
        canonicalPath={canonicalPath}
        locale={locale}
        jsonLd={[
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.sizeGuide, path: canonicalPath },
            ],
            origin
          ),
        ]}
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.sizeGuide },
          ]}
        />

        <div className="glass-panel space-y-8 rounded-2xl p-6 sm:p-10">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-5xl">
              {t.sizeGuide.heading}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base">
              {t.sizeGuide.intro}
            </p>
          </div>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              {t.sizeGuide.unstitchedTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--ca-text-muted)]">
              {t.sizeGuide.unstitchedDesc}
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl bg-[var(--ca-surface-subtle)] p-3">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-[var(--ca-text-muted)]">
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'حصہ' : 'Fabric Piece'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'لمبائی' : 'Length'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'نوٹ' : 'Tailoring Note'}</th>
                  </tr>
                </thead>
                <tbody>
                  {t.sizeGuide.unstitchedRows.map((row) => (
                    <tr key={row.piece}>
                      <td className="px-3 py-2.5 font-medium text-[var(--ca-text)]">{row.piece}</td>
                      <td className="font-mono-nums px-3 py-2.5 text-[var(--ca-text)]">{row.measurement}</td>
                      <td className="px-3 py-2.5 text-[var(--ca-text-muted)]">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              {t.sizeGuide.apparelTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--ca-text-muted)]">
              {t.sizeGuide.apparelDesc}
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl bg-[var(--ca-surface-subtle)] p-3">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-[var(--ca-text-muted)]">
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'سائز' : 'Size'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'چھاتی' : 'Chest'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'لمبائی' : 'Length'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'کمر' : 'Waist Fit'}</th>
                  </tr>
                </thead>
                <tbody>
                  {t.sizeGuide.apparelRows.map((row) => (
                    <tr key={row.size}>
                      <td className="px-3 py-2.5 font-semibold text-[var(--ca-text)]">{row.size}</td>
                      <td className="font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]">{row.chest}</td>
                      <td className="font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]">{row.length}</td>
                      <td className="font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]">{row.waist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
              {t.sizeGuide.boysTitle}
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl bg-[var(--ca-surface-subtle)] p-3">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-[var(--ca-text-muted)]">
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'سائز' : 'Size'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'کمر' : 'Waist'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'لمبائی' : 'Outseam'}</th>
                    <th className="px-3 py-2 text-start">{locale === 'ur' ? 'عمر (تقریباً)' : 'Approx. Age'}</th>
                  </tr>
                </thead>
                <tbody>
                  {t.sizeGuide.boysRows.map((row) => (
                    <tr key={row.size}>
                      <td className="px-3 py-2.5 font-semibold text-[var(--ca-text)]">{row.size}</td>
                      <td className="font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]">{row.waist}</td>
                      <td className="font-mono-nums px-3 py-2.5 text-[var(--ca-text-muted)]">{row.length}</td>
                      <td className="px-3 py-2.5 text-[var(--ca-text-muted)]">{row.ageApprox}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-[var(--ca-surface-subtle)] p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-[var(--ca-text-muted)]">{t.sizeGuide.careNote}</p>
            <Link
              to={localize('/shop')}
              className="btn-press inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
            >
              {t.hero.shopCollection}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
