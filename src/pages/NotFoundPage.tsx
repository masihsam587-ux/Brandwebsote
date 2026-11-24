import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';

export function NotFoundPage() {
  const { t, locale, isRtl, localize } = useLocale();
  const ArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <>
      <SeoHead
        title={`404 Page Not Found — ${t.brand}`}
        description="The requested page could not be found on Cinematic Arts (CA)."
        locale={locale}
        noIndex
      />
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="glass-panel rounded-2xl p-10">
          <p className="font-mono-nums text-xs font-medium text-[var(--ca-accent)]">
            {t.notFound.code}
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--ca-text)]">
            {t.notFound.heading}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ca-text-muted)]">
            {t.notFound.body}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to={localize('/')}
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
            >
              <ArrowIcon className="h-3.5 w-3.5" />
              {t.notFound.backHome}
            </Link>
            <Link
              to={localize('/shop')}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
            >
              {t.nav.browseShop}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
